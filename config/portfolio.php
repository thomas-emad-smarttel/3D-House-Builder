<?php

/*
|--------------------------------------------------------------------------
| Portfolio content — the ONE file you edit
|--------------------------------------------------------------------------
|
| Everything the game and the traditional CV (/cv) display comes from here.
|
| Status values for modules / features:
|   'completed'       -> built and working
|   'in_development'  -> being built right now
|   'planned'         -> designed or intended, not built yet
|
| 'features' can be plain strings or, to track each one separately:
|   ['name' => 'Face matching', 'status' => 'in_development']
|
| Anything with 'placeholder' => true is shown with a "Placeholder" tag in the
| game and on the CV. Remove the flag (or set it to false) once the text is
| real. Empty sections (no features, no tech, no links...) are hidden for real
| content and shown as "add this in config/portfolio.php" for placeholders, so
| nothing is ever invented on your behalf.
|
| Rooms are data-driven: add an entry to 'rooms' and a door appears in the
| mansion automatically. Use 'scene' => 'generic' for any new project room.
|
| NOTE: do not use closures in this file (it must stay `config:cache` safe).
*/

return [

    /* ---------------------------------------------------------------- owner */
    'owner' => [
        'name'        => 'Islam Aly',
        'title'       => 'Software Engineer',
        'tagline'     => 'Replace the name, title and tagline in config/portfolio.php.',
        'location'    => null,
        'placeholder' => true,
    ],

    /*
     | Optional PDF served by the "Download CV" button. Put the file in /public
     | (for example public/cv/my-cv.pdf) and set 'cv/my-cv.pdf'. Without a file,
     | the button opens the printable CV page so the visitor can save it as PDF.
     */
    'cv_file' => null,

    /* -------------------------------------------------------------- contact */
    'contact' => [
        'email'        => 'islam.aly1996@gmail.com',   // e.g. 'you@example.com'
        'linkedin'     => null,   // full URL
        'github'       => null,   // full URL
        'form_enabled' => true,   // contact form inside the game
        // Where form messages are mailed. Set PORTFOLIO_CONTACT_TO in .env.
        // Without it, messages are written to storage/logs/laravel.log.
        'receive_email' => env('PORTFOLIO_CONTACT_TO'),
        'placeholder'  => true,
    ],

    /* -------------------------------------------------------------- profile */
    'profile' => [
        'headline'   => 'Developer profile',
        'intro'      => 'Write a short introduction about who you are and the kind of software you build.',
        'philosophy' => 'Describe how you approach engineering: the principles you work by.',
        'expertise'  => [
            'Replace with your first area of expertise',
            'Replace with your second area of expertise',
            'Replace with your third area of expertise',
        ],
        'goals'       => [
            'Describe where you want your career to go next',
        ],
        'placeholder' => true,
    ],

    /* --------------------------------------------------------------- skills */
    // No ratings on purpose: list only what you can stand behind.
    'skills' => [
        [
            'id' => 'backend', 'name' => 'Backend development',
            'items' => ['PHP', 'Laravel'], 'placeholder' => true,
        ],
        [
            'id' => 'frontend', 'name' => 'Frontend development',
            'items' => ['JavaScript', 'HTML and CSS'], 'placeholder' => true,
        ],
        [
            'id' => 'databases', 'name' => 'Databases',
            'items' => ['Relational database design'], 'placeholder' => true,
        ],
        [
            'id' => 'devops', 'name' => 'DevOps and deployment',
            'items' => ['Add the tools you deploy with'], 'placeholder' => true,
        ],
        [
            'id' => 'apis', 'name' => 'APIs and integrations',
            'items' => ['REST APIs'], 'placeholder' => true,
        ],
        [
            'id' => 'ai', 'name' => 'Artificial intelligence',
            'items' => ['Face verification'], 'placeholder' => true,
        ],
        [
            'id' => 'architecture', 'name' => 'Software architecture',
            'items' => ['Modular application design'], 'placeholder' => true,
        ],
    ],

    /* ------------------------------------------------------------- timeline */
    // Placeholder entries until you provide your real employment history.
    // List NEWEST first, like a CV. The corridor in the game walks oldest -> newest.
    'timeline' => [
        [
            'id' => 'role-1', 'organization' => 'Company or project name',
            'role' => 'Your role', 'dates' => 'Start – End',
            'responsibilities' => ['Describe your main responsibilities'],
            'achievements' => [],
            'placeholder' => true,
        ],
        [
            'id' => 'role-2', 'organization' => 'Previous company or project',
            'role' => 'Your role', 'dates' => 'Start – End',
            'responsibilities' => ['Describe your main responsibilities'],
            'achievements' => [],
            'placeholder' => true,
        ],
        [
            'id' => 'role-3', 'organization' => 'Earlier company or project',
            'role' => 'Your role', 'dates' => 'Start – End',
            'responsibilities' => ['Describe your main responsibilities'],
            'achievements' => [],
            'placeholder' => true,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Rooms
    |--------------------------------------------------------------------------
    | Order = the order of doors along the hall, alternating left and right.
    | The room with 'flagship' => true gets the grand door at the end of the
    | hall and a much larger room. 'scene' picks the 3D environment:
    |   erp | shipping | gym | installments | profile | skills | timeline |
    |   contact | generic
    */
    'rooms' => [

        /* ---- About me ---- */
        [
            'id' => 'profile', 'scene' => 'profile', 'kind' => 'cv',
            'name' => 'Developer Profile',
            'tagline' => 'Who I am, how I work and where I am heading.',
            'accent' => '#d9a85f',
        ],
        [
            'id' => 'skills', 'scene' => 'skills', 'kind' => 'cv',
            'name' => 'Technical Skills',
            'tagline' => 'A constellation of what I work with, grouped by discipline.',
            'accent' => '#6fd3b5',
        ],
        [
            'id' => 'timeline', 'scene' => 'timeline', 'kind' => 'cv',
            'name' => 'Career Timeline',
            'tagline' => 'A walk through the roles and projects behind the work.',
            'accent' => '#e0b26a',
        ],

        /* ---- Projects ---- */
        [
            'id' => 'shipping', 'scene' => 'shipping', 'kind' => 'project',
            'name' => 'Shipping and Delivery Platform',
            'tagline' => 'Logistics control room: orders, routes and shipment tracking.',
            'accent' => '#2fb5a3',
            'overview' => [
                'name' => 'Shipping and Delivery Platform',
                'status' => 'planned',
                'placeholder' => true,
                'problem' => 'Placeholder: describe the business problem this platform solves for shipping and delivery operations.',
                'features' => [],
                'tech' => [],
                'role' => null,
                'architecture' => null,
                'media' => [],
                'links' => ['demo' => null, 'source' => null, 'docs' => null],
            ],
            'modules' => [
                [
                    'id' => 'orders', 'name' => 'Orders and dispatch', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how orders are received, assigned and dispatched.',
                    'features' => ['Order intake', 'Dispatch assignment'],
                ],
                [
                    'id' => 'tracking', 'name' => 'Shipment tracking', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how customers and staff follow a shipment from pickup to delivery.',
                    'features' => ['Delivery status updates'],
                ],
                [
                    'id' => 'routes', 'name' => 'Route planning', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how delivery routes are planned and adjusted.',
                    'features' => [],
                ],
                [
                    'id' => 'warehouse', 'name' => 'Warehouse and distribution', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how stock and parcels move through the warehouse.',
                    'features' => [],
                ],
            ],
        ],
        [
            'id' => 'gym', 'scene' => 'gym', 'kind' => 'project',
            'name' => 'Gym Management System',
            'tagline' => 'Memberships, attendance and payments for a fitness centre.',
            'accent' => '#ff7a59',
            'overview' => [
                'name' => 'Gym Management System',
                'status' => 'planned',
                'placeholder' => true,
                'problem' => 'Placeholder: describe the problem this system solves for gym operations.',
                'features' => [],
                'tech' => [],
                'role' => null,
                'architecture' => null,
                'media' => [],
                'links' => ['demo' => null, 'source' => null, 'docs' => null],
            ],
            'modules' => [
                [
                    'id' => 'members', 'name' => 'Member management', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how member records and memberships are managed.',
                    'features' => ['Member profiles'],
                ],
                [
                    'id' => 'subscriptions', 'name' => 'Subscriptions and payments', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how subscriptions are billed and tracked.',
                    'features' => [],
                ],
                [
                    'id' => 'gym-attendance', 'name' => 'Attendance tracking', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how visits and check-ins are recorded.',
                    'features' => [],
                ],
                [
                    'id' => 'gym-admin', 'name' => 'Administration', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: what staff and managers can configure and review.',
                    'features' => [],
                ],
            ],
        ],
        [
            'id' => 'installments', 'scene' => 'installments', 'kind' => 'project',
            'name' => 'Installments and Payment Management',
            'tagline' => 'Payment schedules, customer accounts and collections.',
            'accent' => '#7b8cff',
            'overview' => [
                'name' => 'Installments and Payment Management',
                'status' => 'planned',
                'placeholder' => true,
                'problem' => 'Placeholder: describe the business problem of tracking installment payments.',
                'features' => [],
                'tech' => [],
                'role' => null,
                'architecture' => null,
                'media' => [],
                'links' => ['demo' => null, 'source' => null, 'docs' => null],
            ],
            'modules' => [
                [
                    'id' => 'plans', 'name' => 'Installment plans', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how installment plans are created and agreed.',
                    'features' => [],
                ],
                [
                    'id' => 'schedules', 'name' => 'Payment schedules', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how due dates and payment status are tracked.',
                    'features' => [],
                ],
                [
                    'id' => 'accounts', 'name' => 'Customer accounts', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how a customer\'s balance and history are presented.',
                    'features' => [],
                ],
                [
                    'id' => 'collections', 'name' => 'Collections and reporting', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how overdue payments and reports are handled.',
                    'features' => [],
                ],
            ],
        ],

        /* ---- Wrap-up ---- */
        [
            'id' => 'contact', 'scene' => 'contact', 'kind' => 'cv',
            'name' => 'Contact and Exit',
            'tagline' => 'Get in touch, download the CV or leave a message.',
            'accent' => '#e8c27a',
        ],

        /* ---- Flagship (gets the grand door at the end of the hall) ---- */
        [
            'id' => 'erp', 'scene' => 'erp', 'kind' => 'project', 'flagship' => true,
            'name' => 'ERP System',
            'tagline' => 'The flagship: an enterprise platform connecting HR, inventory, finance and more.',
            'accent' => '#ffb340',
            'overview' => [
                'name' => 'ERP System — overview',
                'status' => 'planned',
                'placeholder' => true,
                'problem' => 'Placeholder: describe the business problem the ERP solves and who uses it.',
                'features' => [],
                'tech' => [],
                'role' => null,
                'architecture' => 'Placeholder: describe how the modules fit together (data layer, services, integrations).',
                'media' => [],
                'links' => ['demo' => null, 'source' => null, 'docs' => null],
            ],
            'modules' => [
                [
                    'id' => 'hr', 'name' => 'Human Resources', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how employee records and HR processes are managed.',
                    'features' => ['Employee records and profiles', 'Leave and absence requests'],
                ],
                [
                    'id' => 'attendance', 'name' => 'Attendance and Biometrics', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how attendance is captured, including biometric device integrations.',
                    'features' => ['Attendance records', 'Biometric device integration'],
                ],
                [
                    'id' => 'payroll', 'name' => 'Payroll and Employee Administration', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how payroll and employee administration are handled.',
                    'features' => [],
                ],
                [
                    'id' => 'inventory', 'name' => 'Inventory and Warehouse', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how stock and warehouse operations are tracked.',
                    'features' => [],
                ],
                [
                    'id' => 'admin', 'name' => 'Administration and Permissions', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how users, roles and permissions are managed.',
                    'features' => ['Role-based permissions'],
                ],
                [
                    'id' => 'workflows', 'name' => 'Financial and Operational Workflows', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: which financial or operational workflows the ERP covers.',
                    'features' => [],
                ],
                [
                    'id' => 'face', 'name' => 'AI Face Verification', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: how face verification confirms identity for attendance or access.',
                    'features' => [],
                ],
                [
                    'id' => 'notifications', 'name' => 'Notifications and Real-time Updates', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: what users are notified about and how updates reach them live.',
                    'features' => [],
                ],
                [
                    'id' => 'integrations', 'name' => 'APIs and External Integrations', 'status' => 'planned', 'placeholder' => true,
                    'problem' => 'Placeholder: which external systems the ERP connects to and how.',
                    'features' => [],
                ],
            ],
        ],

        /*
         | Example of a brand new room (uncomment, edit, refresh):
         |
         | [
         |     'id' => 'ml-lab', 'scene' => 'generic', 'kind' => 'project',
         |     'name' => 'Computer Vision Lab',
         |     'tagline' => 'One line shown on the door.',
         |     'accent' => '#c084fc',
         |     'overview' => [...same keys as above...],
         |     'modules' => [ [ 'id' => 'x', 'name' => 'Module', 'status' => 'planned' ] ],
         | ],
         */
    ],
];
