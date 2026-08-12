<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

class FinancialLogEncryptionService
{
    /**
     * Get the secure file path for the financial audit log
     * Obfuscated location to prevent easy discovery
     *
     * @return string Absolute path to the audit log file
     */
    public static function getSecureLogPath(): string
    {
        // Store in framework cache directory with obfuscated name
        // Looks like a system cache file to avoid detection
        $storagePath = storage_path('framework/cache/.audit');

        // Create directory if it doesn't exist
        if (!is_dir($storagePath)) {
            mkdir($storagePath, 0755, true);
            // Add .gitignore to prevent tracking
            file_put_contents($storagePath . '/.gitignore', "*\n!.gitignore\n");
        }

        // Obfuscated filename - looks like a system cache file
        return $storagePath . DIRECTORY_SEPARATOR . 'sys_fa_' . md5('financial_audit_trail') . '.dat';
    }

    /**
     * Encrypt JSON data for storage
     *
     * @param string $data Plain JSON string
     * @return string Encrypted data
     */
    public static function encrypt(string $data): string
    {
        try {
            return Crypt::encryptString($data);
        } catch (\Exception $e) {
            Log::error('Financial log encryption failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Decrypt JSON data for reading
     *
     * @param string $encryptedData Encrypted data
     * @return string Plain JSON string
     */
    public static function decrypt(string $encryptedData): string
    {
        try {
            return Crypt::decryptString($encryptedData);
        } catch (\Exception $e) {
            Log::error('Financial log decryption failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Check if file content is encrypted
     *
     * @param string $content File content
     * @return bool True if encrypted, false if plain JSON
     */
    public static function isEncrypted(string $content): bool
    {
        // Encrypted data won't start with '[' or '{' (JSON markers)
        // and will be base64-encoded
        $trimmed = trim($content);

        if (empty($trimmed)) {
            return false;
        }

        // Check if it looks like JSON
        if ($trimmed[0] === '[' || $trimmed[0] === '{') {
            return false;
        }

        // Try to decrypt to verify
        try {
            Crypt::decryptString($trimmed);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Read financial log file with automatic decryption
     *
     * @param string $filePath Path to the JSON file
     * @return array Decoded JSON data
     */
    public static function readLogFile(string $filePath): array
    {
        if (!file_exists($filePath)) {
            return [];
        }

        $content = file_get_contents($filePath);

        if (empty($content)) {
            return [];
        }

        // Auto-detect if encrypted
        if (self::isEncrypted($content)) {
            $content = self::decrypt($content);
        }

        $data = json_decode($content, true);
        return $data ?? [];
    }

    /**
     * Write financial log file with automatic encryption
     *
     * @param string $filePath Path to the JSON file
     * @param array $data Data to write
     * @return bool Success status
     */
    public static function writeLogFile(string $filePath, array $data): bool
    {
        try {
            $jsonContent = json_encode($data, JSON_PRETTY_PRINT);
            $encryptedContent = self::encrypt($jsonContent);

            return file_put_contents($filePath, $encryptedContent) !== false;
        } catch (\Exception $e) {
            Log::error('Failed to write encrypted financial log: ' . $e->getMessage());
            return false;
        }
    }
}
