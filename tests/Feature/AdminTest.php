<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\PortfolioStore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create();
    }

    private function content(): array
    {
        return $this->actingAs($this->admin())->getJson('/admin/content')->assertOk()->json('content');
    }

    public function test_guests_cannot_reach_the_dashboard_or_its_api(): void
    {
        $this->get('/admin')->assertRedirect(route('login'));
        $this->getJson('/admin/content')->assertUnauthorized();
        $this->putJson('/admin/content', ['content' => []])->assertUnauthorized();
        $this->postJson('/admin/media')->assertUnauthorized();
    }

    public function test_admin_can_sign_in_and_out(): void
    {
        $user = User::factory()->create();

        $this->get('/admin/login')->assertOk();
        $this->post('/admin/login', ['email' => $user->email, 'password' => 'wrong'])->assertSessionHasErrors('email');
        $this->post('/admin/login', ['email' => $user->email, 'password' => 'password'])->assertRedirect(route('admin.dashboard'));
        $this->get('/admin')->assertOk()->assertSee('admin-app', false);
        $this->post('/admin/logout')->assertRedirect(route('login'));
        $this->get('/admin')->assertRedirect(route('login'));
    }

    public function test_content_starts_from_the_config_defaults(): void
    {
        $content = $this->content();

        $this->assertSame(config('portfolio.owner.name'), $content['owner']['name']);
        $this->assertCount(count(config('portfolio.rooms')), $content['rooms']);
    }

    public function test_saving_changes_the_public_game_and_cv(): void
    {
        $content = $this->content();
        $content['owner']['name'] = 'Grace Hopper';
        $content['rooms'][] = [
            'id' => 'lab', 'scene' => 'generic', 'kind' => 'project', 'name' => 'Vision Lab', 'tagline' => 'New room',
            'accent' => '#c084fc', 'flagship' => false, 'overview' => null,
            'modules' => [['id' => 'det', 'name' => 'Detector', 'status' => 'completed']],
        ];

        $this->putJson('/admin/content', ['content' => $content])->assertOk()->assertJsonPath('content.owner.name', 'Grace Hopper');

        $this->get('/')->assertOk()->assertSee('Grace Hopper')->assertSee('Vision Lab');
        $this->get('/cv')->assertOk()->assertSee('Grace Hopper')->assertSee('Detector');
    }

    public function test_invalid_content_is_rejected_with_field_paths_and_nothing_is_saved(): void
    {
        $content = $this->content();
        $content['owner']['name'] = '';
        $content['rooms'][0]['accent'] = 'red';
        $content['contact']['linkedin'] = 'javascript:alert(1)';

        $this->putJson('/admin/content', ['content' => $content])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['owner.name', 'rooms.0.accent', 'contact.linkedin']]);

        $this->assertFalse(app(PortfolioStore::class)->isCustomised());
    }

    public function test_content_is_escaped_on_the_public_pages(): void
    {
        $content = $this->content();
        $content['owner']['name'] = '<script>alert("x")</script>';
        $this->putJson('/admin/content', ['content' => $content])->assertOk();

        $this->get('/')->assertDontSee('<script>alert("x")</script>', false);
        $this->get('/cv')->assertDontSee('<script>alert("x")</script>', false);
    }

    public function test_every_save_keeps_a_restorable_revision(): void
    {
        $content = $this->content();
        $original = $content['owner']['name'];

        $content['owner']['name'] = 'First edit';
        $this->putJson('/admin/content', ['content' => $content])->assertOk();
        $content['owner']['name'] = 'Second edit';
        $this->putJson('/admin/content', ['content' => $content])->assertOk();

        $revisions = $this->getJson('/admin/revisions')->assertOk()->json('revisions');
        $this->assertCount(1, $revisions); // the first save created the row, the second archived it

        $this->postJson("/admin/revisions/{$revisions[0]['id']}/restore")
            ->assertOk()->assertJsonPath('content.owner.name', 'First edit');
        $this->postJson('/admin/content/reset')->assertOk()->assertJsonPath('content.owner.name', $original);
    }

    public function test_the_receiving_address_is_private(): void
    {
        $content = $this->content();
        $content['contact']['receive_email'] = 'secret-inbox@example.test';
        $this->putJson('/admin/content', ['content' => $content])->assertOk();

        $this->getJson('/admin/content')->assertJsonPath('content.contact.receive_email', 'secret-inbox@example.test');
        auth()->logout();
        $this->get('/')->assertOk()->assertDontSee('secret-inbox@example.test');
    }

    public function test_a_custom_room_layout_is_saved_and_reaches_the_game(): void
    {
        $content = $this->content();
        $idx = array_search('my-room', array_column($content['rooms'], 'id'));
        $this->assertNotFalse($idx, 'the starter custom room exists');

        $content['rooms'][$idx]['layout']['objects'][] = [
            'id' => 'plant-9', 'type' => 'plant', 'x' => 3, 'z' => 2, 'rot' => 0, 'p' => ['s' => 1.5],
        ];
        $content['rooms'][$idx]['layout']['theme']['floor'] = 'marble';

        $this->putJson('/admin/content', ['content' => $content])->assertOk()
            ->assertJsonPath("content.rooms.{$idx}.layout.theme.floor", 'marble');

        $this->get('/')->assertOk()->assertSee('plant-9')->assertSee('marble');
    }

    public function test_layouts_that_block_the_entrance_or_use_unknown_objects_are_rejected(): void
    {
        $content = $this->content();
        $idx = array_search('my-room', array_column($content['rooms'], 'id'));
        $content['rooms'][$idx]['layout']['objects'][] = ['id' => 'wall-1', 'type' => 'block', 'x' => 0, 'z' => 7.5, 'rot' => 0, 'p' => ['w' => 4, 'd' => 1]];
        $content['rooms'][$idx]['layout']['objects'][] = ['id' => 'x-1', 'type' => 'teleporter', 'x' => 0, 'z' => 0, 'rot' => 0, 'p' => []];

        $this->putJson('/admin/content', ['content' => $content])
            ->assertStatus(422)
            ->assertJsonValidationErrors([]) // shape check only: the keys are layout paths
            ->assertJsonStructure(['errors']);

        $errors = $this->putJson('/admin/content', ['content' => $content])->json('errors');
        $this->assertTrue(collect(array_keys($errors))->contains(fn ($k) => str_contains($k, '.layout.objects.') && str_ends_with($k, '.type')));
        $this->assertTrue(collect($errors)->contains(fn ($m) => str_contains($m, 'entrance')));
    }

    public function test_media_can_be_uploaded_listed_and_deleted(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        $res = $this->postJson('/admin/media', ['files' => [UploadedFile::fake()->image('Shot One.png')]])->assertCreated();
        $name = $res->json('files.0.name');
        $this->assertStringEndsWith('-shot-one.png', $name);
        $this->assertSame("/storage/portfolio/{$name}", $res->json('files.0.url'));
        Storage::disk('public')->assertExists("portfolio/{$name}");

        $this->getJson('/admin/media')->assertOk()->assertJsonCount(1, 'files');
        $this->deleteJson('/admin/media', ['name' => $name])->assertOk();
        Storage::disk('public')->assertMissing("portfolio/{$name}");
    }

    public function test_dangerous_uploads_and_path_traversal_are_refused(): void
    {
        Storage::fake('public');
        $this->actingAs($this->admin());

        $this->postJson('/admin/media', ['files' => [UploadedFile::fake()->create('run.php', 10)]])->assertStatus(422);
        $this->postJson('/admin/media', ['files' => [UploadedFile::fake()->create('image.svg', 10, 'image/svg+xml')]])->assertStatus(422);
        $this->deleteJson('/admin/media', ['name' => '../../.env'])->assertStatus(422);
    }
}
