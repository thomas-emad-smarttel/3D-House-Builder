<?php

namespace Tests\Feature;

use App\Support\PortfolioStore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PortfolioTest extends TestCase
{
    use RefreshDatabase;

    public function test_game_page_loads_with_embedded_data(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('Developer Portfolio Experience')
            ->assertSee('portfolio-data', false);
    }

    public function test_game_data_never_leaks_the_receiving_address(): void
    {
        $store = app(PortfolioStore::class);
        $content = $store->defaults();
        $content['contact']['receive_email'] = 'secret-inbox@example.test';
        $store->save($content);

        $this->get('/')->assertOk()->assertDontSee('secret-inbox@example.test');
    }

    public function test_traditional_cv_loads_without_the_game(): void
    {
        $this->get('/cv')->assertOk()->assertSee(config('portfolio.owner.name'));
    }

    public function test_cv_download_falls_back_to_printable_page(): void
    {
        $this->get('/cv/download')->assertRedirect(route('cv', ['print' => 1]));
    }

    public function test_contact_form_validates_input(): void
    {
        $this->postJson('/contact', ['name' => '', 'email' => 'nope', 'message' => 'short'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'message']);
    }

    public function test_contact_form_accepts_valid_message(): void
    {
        $this->postJson('/contact', [
            'name'    => 'Visitor',
            'email'   => 'visitor@example.test',
            'message' => 'Hello, I would like to talk about a project.',
        ])->assertOk()->assertJson(['ok' => true]);
    }

    public function test_honeypot_submissions_are_silently_dropped(): void
    {
        $this->postJson('/contact', [
            'name'    => 'Bot',
            'email'   => 'bot@example.test',
            'message' => 'Buy cheap things from my website now.',
            'website' => 'http://spam.test',
        ])->assertOk();
    }
}
