<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    /**
     * Send a push notification to one or multiple tokens.
     * Supports both Expo Push Token format and raw tokens.
     *
     * @param string|array $tokens Single token string or array of token strings.
     * @param string $title
     * @param string $body
     * @param array $data Custom data payload.
     * @return bool
     */
    public function send(string|array $tokens, string $title, string $body, array $data = []): bool
    {
        if (empty($tokens)) {
            return false;
        }

        $tokenList = is_array($tokens) ? $tokens : [$tokens];

        // Filter and categorize tokens
        $expoTokens = [];
        $fcmTokens = [];

        foreach ($tokenList as $token) {
            if (empty($token)) continue;

            if (str_starts_with($token, 'ExponentPushToken') || str_starts_with($token, 'ExpoPushToken')) {
                $expoTokens[] = $token;
            } else {
                $fcmTokens[] = $token;
            }
        }

        $success = true;

        // 1. Dispatch Expo notifications
        if (!empty($expoTokens)) {
            $success = $this->sendExpoNotifications($expoTokens, $title, $body, $data) && $success;
        }

        // 2. Dispatch FCM notifications (fallback placeholder - ready to integrate)
        if (!empty($fcmTokens)) {
            $success = $this->sendFcmNotifications($fcmTokens, $title, $body, $data) && $success;
        }

        return $success;
    }

    /**
     * Send push notifications using Expo's HTTP API.
     */
    private function sendExpoNotifications(array $tokens, string $title, string $body, array $data): bool
    {
        $payloads = [];
        foreach ($tokens as $token) {
            $payloads[] = [
                'to' => $token,
                'sound' => 'default',
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'priority' => 'high',
                'channelId' => 'default', // Useful for Android notification channels
            ];
        }

        try {
            // Expo allows sending up to 100 messages per chunk
            $chunks = array_chunk($payloads, 100);
            foreach ($chunks as $chunk) {
                $response = Http::withHeaders([
                    'Accept' => 'application/json',
                    'Accept-encoding' => 'gzip, deflate',
                    'Content-Type' => 'application/json',
                ])->post('https://exp.host/--/api/v2/push/send', $chunk);

                if ($response->failed()) {
                    Log::error('Expo Push Notification batch failed:', [
                        'status' => $response->status(),
                        'body' => $response->body()
                    ]);
                    return false;
                }
            }

            return true;
        } catch (\Exception $e) {
            Log::error('Expo Push Notification Exception:', ['message' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Send push notifications using Google Firebase Cloud Messaging (FCM) HTTP V1 API.
     */
    private function sendFcmNotifications(array $tokens, string $title, string $body, array $data): bool
    {
        $credentialsPath = env('FIREBASE_CREDENTIALS_PATH', storage_path('app/firebase-service-account.json'));

        // Resolve absolute path if relative
        if (!str_starts_with($credentialsPath, '/')) {
            $credentialsPath = base_path($credentialsPath);
        }

        if (!file_exists($credentialsPath)) {
            Log::warning('FCM credentials file not found at: ' . $credentialsPath . '. Storing token silently.');
            return false;
        }

        try {
            // 1. Read JSON file to get Project ID
            $credentials = json_decode(file_get_contents($credentialsPath), true);
            $projectId = $credentials['project_id'] ?? null;

            if (empty($projectId)) {
                Log::error('Firebase project_id could not be parsed from credentials file.');
                return false;
            }

            // 2. Authenticate Google Client to fetch OAuth2 Access Token
            $client = new \Google\Client();
            $client->setAuthConfig($credentialsPath);
            $client->addScope('https://www.googleapis.com/auth/firebase.messaging');
            
            $accessTokenInfo = $client->fetchAccessTokenWithAssertion();
            $accessToken = $accessTokenInfo['access_token'] ?? null;

            if (empty($accessToken)) {
                Log::error('FCM OAuth2 Access Token generation failed:', $accessTokenInfo);
                return false;
            }

            $success = true;

            // 3. Send to each token individually (FCM V1 standard)
            foreach ($tokens as $token) {
                $payload = [
                    'message' => [
                        'token' => $token,
                        'notification' => [
                            'title' => $title,
                            'body' => $body,
                        ],
                        'data' => array_map('strval', $data), // FCM V1 requires all data values to be strings
                        'android' => [
                            'priority' => 'high',
                            'notification' => [
                                'sound' => 'default',
                            ],
                        ],
                        'apns' => [
                            'payload' => [
                                'aps' => [
                                    'sound' => 'default',
                                ],
                            ],
                        ],
                    ],
                ];

                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$accessToken}",
                    'Content-Type' => 'application/json',
                ])->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", $payload);

                if ($response->failed()) {
                    Log::error("FCM push delivery failed for token {$token}:", [
                        'status' => $response->status(),
                        'body' => $response->body()
                    ]);
                    $success = false;
                }
            }

            return $success;
        } catch (\Exception $e) {
            Log::error('FCM Push Notification Exception:', ['message' => $e->getMessage()]);
            return false;
        }
    }
}
