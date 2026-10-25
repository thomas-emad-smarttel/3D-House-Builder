<?php

namespace App\Http\Controllers;

use App\Support\PortfolioStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function send(Request $request, PortfolioStore $store): JsonResponse
    {
        $contact = $store->content()['contact'];
        abort_unless($contact['form_enabled'], 404);

        $data = $request->validate([
            'name'    => ['required', 'string', 'max:100'],
            'email'   => ['required', 'email', 'max:150'],
            'message' => ['required', 'string', 'min:10', 'max:4000'],
            'website' => ['nullable', 'string', 'max:200'], // honeypot
        ]);

        // Bots fill the hidden "website" field. Pretend success, send nothing.
        if (! empty($data['website'])) {
            return response()->json(['ok' => true]);
        }

        Log::info('Portfolio contact message', [
            'name'    => $data['name'],
            'email'   => $data['email'],
            'message' => $data['message'],
        ]);

        $to = $contact['receive_email'];

        if ($to) {
            Mail::raw(
                "From: {$data['name']} <{$data['email']}>\n\n{$data['message']}",
                function ($mail) use ($to, $data) {
                    $mail->to($to)
                        ->replyTo($data['email'], $data['name'])
                        ->subject('Portfolio message from ' . $data['name']);
                }
            );
        }

        return response()->json(['ok' => true]);
    }
}
