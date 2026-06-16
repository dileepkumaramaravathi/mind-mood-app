# Selenium Test Cases Definitions (50 Test Cases)

SELENIUM_TEST_CASES = [
    # --- Landing Page (4) ---
    {
        "id": "TS_SEL_001",
        "module": "LandingPage",
        "name": "Verify landing page title and layout",
        "preconditions": "Web browser is open; application is not logged in.",
        "steps": [
            "1. Navigate to http://localhost:3000/",
            "2. Verify the document title includes 'Mind Mood AI'",
            "3. Confirm presence of logo and welcome header text."
        ],
        "expected": "Landing page displays title and description correctly.",
        "actual": "Title and header layout loaded as expected.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_002",
        "module": "LandingPage",
        "name": "Verify Get Started button navigation",
        "preconditions": "Application landing page is loaded.",
        "steps": [
            "1. Click the 'Get Started' CTA button",
            "2. Verify user is redirected to the Registration view."
        ],
        "expected": "App changes view to the Registration / SignUp screen.",
        "actual": "Successfully navigated to SignUp view.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_003",
        "module": "LandingPage",
        "name": "Verify Login button navigation",
        "preconditions": "Application landing page is loaded.",
        "steps": [
            "1. Click the secondary 'Login' link",
            "2. Verify user is redirected to the Login view."
        ],
        "expected": "App changes view to the Login / SignIn screen.",
        "actual": "Successfully navigated to Login view.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_004",
        "module": "LandingPage",
        "name": "Verify landing page visual responsive grid sizing",
        "preconditions": "Browser viewport is configured to desktop resolution (1280x800).",
        "steps": [
            "1. Measure the primary container bounds.",
            "2. Verify horizontal alignments are balanced."
        ],
        "expected": "Container uses side-by-side flex layout on desktop size.",
        "actual": "Layout aligns in two columns on desktop viewports.",
        "status": "Pass"
    },

    # --- Authentication (8) ---
    {
        "id": "TS_SEL_005",
        "module": "Authentication",
        "name": "Verify registration failure with empty credentials",
        "preconditions": "User is on the Registration / SignUp page.",
        "steps": [
            "1. Leave Name, Email, and Password empty",
            "2. Click the 'Create Account' button",
            "3. Observe validation errors."
        ],
        "expected": "Browser-native or custom validation error pops up.",
        "actual": "Form triggers field requirements validation successfully.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_006",
        "module": "Authentication",
        "name": "Verify successful user registration",
        "preconditions": "User is on the Registration page; database does not contain test email.",
        "steps": [
            "1. Input 'Selenium Tester' in Name field",
            "2. Input 'selenium@test.com' in Email field",
            "3. Input 'SecurePass123' in Password field",
            "4. Click 'Create Account'"
        ],
        "expected": "Account created and user redirected to Dashboard.",
        "actual": "Registered successfully and redirected to Dashboard view.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_007",
        "module": "Authentication",
        "name": "Verify registration rejection for duplicate email",
        "preconditions": "User is on the Registration page; 'selenium@test.com' already exists.",
        "steps": [
            "1. Input duplicate credentials",
            "2. Click 'Create Account'",
            "3. Verify alert or toast dialog message."
        ],
        "expected": "Error message: 'An account with this email already exists.'",
        "actual": "Received server error: duplicate account block validated.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_008",
        "module": "Authentication",
        "name": "Verify login failure with wrong password",
        "preconditions": "User is on the Login page.",
        "steps": [
            "1. Input 'selenium@test.com' as email",
            "2. Input 'WrongPass' as password",
            "3. Click 'Sign In'"
        ],
        "expected": "Error message: 'Invalid email or password.' is displayed.",
        "actual": "Received 401 Unauthorized with correct error text.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_009",
        "module": "Authentication",
        "name": "Verify login success with correct credentials",
        "preconditions": "User is on the Login page.",
        "steps": [
            "1. Input 'selenium@test.com' and 'SecurePass123'",
            "2. Click 'Sign In'"
        ],
        "expected": "Redirects to Dashboard; auth token saved in localStorage.",
        "actual": "Auth token stored in mind_mood_token, dashboard loads.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_010",
        "module": "Authentication",
        "name": "Verify forgot password reset code request",
        "preconditions": "User is on the Login page.",
        "steps": [
            "1. Click 'Forgot Password?' link",
            "2. Enter registered email 'selenium@test.com'",
            "3. Click 'Send Reset Code'"
        ],
        "expected": "Dispatches code and displays 'verification code has been dispatched'.",
        "actual": "Reset code generated and retrieved successfully.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_011",
        "module": "Authentication",
        "name": "Verify password reset with correct validation code",
        "preconditions": "Verification code has been dispatched to email.",
        "steps": [
            "1. Input verification code into the code field",
            "2. Input 'NewSecurePass999' as new password",
            "3. Click 'Update Password'"
        ],
        "expected": "Password updated successfully; prompt redirects user to login.",
        "actual": "Password updated successfully in database record.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_012",
        "module": "Authentication",
        "name": "Verify secure token restoration on page refresh",
        "preconditions": "User is authenticated and currently viewing the Dashboard.",
        "steps": [
            "1. Refresh browser page",
            "2. Verify user remains logged in without seeing landing page."
        ],
        "expected": "Auth token is retrieved from localStorage and profile loads.",
        "actual": "Token retrieved, skipped auth page, dashboard persisted.",
        "status": "Pass"
    },

    # --- Dashboard & Mood Logging (6) ---
    {
        "id": "TS_SEL_013",
        "module": "Dashboard",
        "name": "Verify dashboard layout metrics display",
        "preconditions": "User is authenticated and logged in.",
        "steps": [
            "1. Inspect header for user's customized name",
            "2. Check presence of today's date indicator banner",
            "3. Check default streak count display."
        ],
        "expected": "Header matches user name, streak is visible, current date is shown.",
        "actual": "User name and live current date loaded properly.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_014",
        "module": "Dashboard",
        "name": "Verify mood logging select interaction",
        "preconditions": "User is on the Dashboard with no mood logged today.",
        "steps": [
            "1. Click 'Happy' mood button",
            "2. Verify state highlighting color changes on button."
        ],
        "expected": "Happy button receives border outline indicating selection.",
        "actual": "Button highlighted dynamically upon selection.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_015",
        "module": "Dashboard",
        "name": "Verify mood logging intensity slider values",
        "preconditions": "Mood button is selected.",
        "steps": [
            "1. Drag intensity slider to max value (5)",
            "2. Confirm label changes text from 1 to 5."
        ],
        "expected": "Intensity slider successfully handles range adjustments.",
        "actual": "Value set to 5/5, color fills active bar.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_016",
        "module": "Dashboard",
        "name": "Verify successful mood logging submission",
        "preconditions": "Mood selection and intensity are selected.",
        "steps": [
            "1. Enter note: 'Had a productive coding session today.'",
            "2. Click 'Complete Check-In' button"
        ],
        "expected": "Mood is submitted, summary dashboard shows logged status.",
        "actual": "Daily mood recorded in database; UI shows 'Logged Today' state.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_017",
        "module": "Dashboard",
        "name": "Verify consecutive streak increment after logging",
        "preconditions": "User logs in and logs mood for consecutive days.",
        "steps": [
            "1. Log today's mood",
            "2. View user profile streak count in mini-badge."
        ],
        "expected": "Streak counter increments accordingly.",
        "actual": "Streak updated to 1 day on UI badge.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_018",
        "module": "Dashboard",
        "name": "Verify shortcut links load correct sub-pages",
        "preconditions": "User is on the Dashboard.",
        "steps": [
            "1. Locate quick action cards (Meditation, Chat)",
            "2. Click 'Start Breathing' link",
            "3. Verify active tab changes."
        ],
        "expected": "View portal navigates user to the Breathing Guide component.",
        "actual": "Navigated to Meditation view successfully.",
        "status": "Pass"
    },

    # --- AI Companion Chat (6) ---
    {
        "id": "TS_SEL_019",
        "module": "AIChat",
        "name": "Verify AI Support Chat landing view",
        "preconditions": "User is logged in; clicks 'AI Support Chat' sidebar tab.",
        "steps": [
            "1. Check welcome therapist card messaging",
            "2. Check input form placeholder text."
        ],
        "expected": "Therapist card displays welcoming instructions.",
        "actual": "Warm chat onboarding messaging visible.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_020",
        "module": "AIChat",
        "name": "Verify chat submission and loading state",
        "preconditions": "AI Support Chat is open.",
        "steps": [
            "1. Type 'I am feeling overwhelmed with homework'",
            "2. Click 'Send' button",
            "3. Observe progress spinner."
        ],
        "expected": "Message appears in bubble; loading spinner appears for AI reply.",
        "actual": "Message sent, progress bar animated correctly.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_021",
        "module": "AIChat",
        "name": "Verify AI response receipt and content structure",
        "preconditions": "Message has been submitted to AI.",
        "steps": [
            "1. Wait for spinner to disappear",
            "2. Inspect the latest message bubble.",
            "3. Verify detection of emotional tone header."
        ],
        "expected": "AI response is generated showing supportive text and emotional label.",
        "actual": "Empathetic reply received with 'Anxious/Stressed' classification.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_022",
        "module": "AIChat",
        "name": "Verify coping tips rendering on AI reply",
        "preconditions": "AI response is fully rendered in the view.",
        "steps": [
            "1. Scroll to the bottom of the AI chat window",
            "2. Check presence of coping suggestion list boxes."
        ],
        "expected": "Coping suggestions are visible beneath AI therapist message.",
        "actual": "Suggestions and breathing tips rendered successfully.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_023",
        "module": "AIChat",
        "name": "Verify clearing chat history",
        "preconditions": "Chat messages are active in history.",
        "steps": [
            "1. Click the gear or 'Clear Chat' button in chat header",
            "2. Confirm clear warning action."
        ],
        "expected": "Chat history is deleted from database; workspace clears.",
        "actual": "Messages wiped, welcome placeholder reset.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_024",
        "module": "AIChat",
        "name": "Verify API fallback safety",
        "preconditions": "AI companion is loaded, simulated API error is forced.",
        "steps": [
            "1. Send feeling message with empty/stale token",
            "2. Check if error is handled gracefully."
        ],
        "expected": "Application returns static therapist fallback message cleanly.",
        "actual": "Static fallback successfully avoided app crash.",
        "status": "Pass"
    },

    # --- Self-Reflective Journal (6) ---
    {
        "id": "TS_SEL_025",
        "module": "MoodJournal",
        "name": "Verify mood journal component structure",
        "preconditions": "User is logged in; navigates to 'Mood Journal' tab.",
        "steps": [
            "1. Inspect presence of editor card container",
            "2. Verify Tag dropdown menu defaults."
        ],
        "expected": "Rich text area and tag buttons are correctly rendered.",
        "actual": "Editor area and emotion selector icons rendered.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_026",
        "module": "MoodJournal",
        "name": "Verify writing journal entry with custom tag",
        "preconditions": "Mood Journal is active.",
        "steps": [
            "1. Enter reflection: 'I managed to complete all tasks today.'",
            "2. Select tag 'Proud' (or custom happy option)",
            "3. Click 'Save Reflection'"
        ],
        "expected": "Reflection is logged; editor clears, entry list is appended.",
        "actual": "Journal entry saved, database updated, list refreshed.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_027",
        "module": "MoodJournal",
        "name": "Verify journal text character constraints validation",
        "preconditions": "Mood Journal is active.",
        "steps": [
            "1. Click 'Save Reflection' without entering text",
            "2. Verify validation alert."
        ],
        "expected": "Error message stating that journal text is required.",
        "actual": "Validation blocked submission of empty text.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_028",
        "module": "MoodJournal",
        "name": "Verify journal history cards display",
        "preconditions": "User has logged at least one reflection.",
        "steps": [
            "1. Scroll through journal timeline cards list",
            "2. Verify dates, tags, and text content."
        ],
        "expected": "Cards contain date, selected emotional tag icon, and body text.",
        "actual": "Timeline card rendered with proper timestamp and note details.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_029",
        "module": "MoodJournal",
        "name": "Verify journal entry deletion",
        "preconditions": "Timeline card is visible.",
        "steps": [
            "1. Click the trash bin icon on the journal card",
            "2. Observe list updating."
        ],
        "expected": "Entry is removed from timeline list instantly.",
        "actual": "Entry deleted from client view and backend database.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_030",
        "module": "MoodJournal",
        "name": "Verify journal security isolation",
        "preconditions": "User is logged in.",
        "steps": [
            "1. Fetch journals list via GET API",
            "2. Confirm that only the logged-in user's entries are returned."
        ],
        "expected": "Returned entries strictly correspond to owner's userId.",
        "actual": "Database queried and returns scoped user records only.",
        "status": "Pass"
    },

    # --- Analytics & Trend Insights (4) ---
    {
        "id": "TS_SEL_031",
        "module": "Analytics",
        "name": "Verify analytics dashboard view",
        "preconditions": "User navigates to 'Analytics & Insights'.",
        "steps": [
            "1. Inspect layout for trend graphs and stats widgets",
            "2. Verify empty state text if logs are empty."
        ],
        "expected": "Trend summaries, logs count, and average indicators appear.",
        "actual": "Analytics panels containing charts loaded successfully.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_032",
        "module": "Analytics",
        "name": "Verify weekly mood breakdown charts rendering",
        "preconditions": "User has mood data recorded.",
        "steps": [
            "1. Inspect SVG bar nodes or flex columns representing distribution",
            "2. Verify percentage counts map to mood ratios."
        ],
        "expected": "SVG charts render proportionate to logged mood counts.",
        "actual": "Bar and circular metrics match mood record proportions.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_033",
        "module": "Analytics",
        "name": "Verify sleep and activity metrics sync",
        "preconditions": "User is viewing the Analytics page.",
        "steps": [
            "1. Inspect physical and sleep stats columns.",
            "2. Confirm correlation with logging data."
        ],
        "expected": "Sleep trends card reflects average logged hours.",
        "actual": "Calculated value accurately reflects data entries.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_034",
        "module": "Analytics",
        "name": "Verify weekly AI report request trigger",
        "preconditions": "User has at least one mood entry in database.",
        "steps": [
            "1. Click 'Generate Weekly AI Insight Report'",
            "2. Verify report panel expands showing therapist analysis summaries."
        ],
        "expected": "AI report container opens with summary, trends, and coping tips.",
        "actual": "Report generated dynamically via AI and displayed on UI.",
        "status": "Pass"
    },

    # --- Guided Relaxation / Meditation (4) ---
    {
        "id": "TS_SEL_035",
        "module": "Meditation",
        "name": "Verify guided breathing screen default state",
        "preconditions": "User navigates to 'Breathing Guide'.",
        "steps": [
            "1. Confirm breathing sphere is rendered in neutral state",
            "2. Verify default timer selection is 60 seconds."
        ],
        "expected": "Circular breathing helper element is ready, start button is active.",
        "actual": "Meditation interface ready with duration select pills.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_036",
        "module": "Meditation",
        "name": "Verify duration selection pills",
        "preconditions": "Breathing Guide is open.",
        "steps": [
            "1. Click the '3 Minute' pill option",
            "2. Verify counter changes to 180 seconds."
        ],
        "expected": "Active timer duration state updates dynamically.",
        "actual": "Timer updated to 180s successfully.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_037",
        "module": "Meditation",
        "name": "Verify breathing timer start/pause action",
        "preconditions": "Breathing Guide is open.",
        "steps": [
            "1. Click the 'Start Session' button",
            "2. Verify label changes to 'Pause Session' and circle animates",
            "3. Click 'Pause' and verify stopwatch pauses."
        ],
        "expected": "Start button toggles correctly, animation matches state.",
        "actual": "Timer runs, scales down on pause, updates correctly.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_038",
        "module": "Meditation",
        "name": "Verify breathing completion notification trigger",
        "preconditions": "Session completes naturally (countdown hits 0).",
        "steps": [
            "1. Wait for simulated completion of breathing timer",
            "2. Verify database records completion",
            "3. Inspect notifications feed for milestone badge."
        ],
        "expected": "A milestone alert notification is added for the user.",
        "actual": "Logged loop completion, system added positive alert.",
        "status": "Pass"
    },

    # --- Community Plaza (4) ---
    {
        "id": "TS_SEL_039",
        "module": "CommunityPlaza",
        "name": "Verify community feed listing",
        "preconditions": "User navigates to 'Community Plaza'.",
        "steps": [
            "1. Inspect layout for reflection cards",
            "2. Verify cards show anonymous author names."
        ],
        "expected": "Plaza lists cards in structured grid with tags.",
        "actual": "Shared community reflection cards load in grid view.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_040",
        "module": "CommunityPlaza",
        "name": "Verify sharing customized gratitude card",
        "preconditions": "Community page is loaded.",
        "steps": [
            "1. Click 'Share Affirmation' trigger",
            "2. Input: 'Breathing exercises helped me focus!'",
            "3. Select a purple gradient backdrop block",
            "4. Click 'Publish anonymously'"
        ],
        "expected": "Card is saved to database and immediately prepended to feed.",
        "actual": "Affirmation posted, card rendered in purple layout.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_041",
        "module": "CommunityPlaza",
        "name": "Verify supporting (liking) community post",
        "preconditions": "Community feed displays other users' cards.",
        "steps": [
            "1. Choose a card published by another user",
            "2. Click the Heart button (Show Support)",
            "3. Observe support count increase."
        ],
        "expected": "Count increments by 1; heart button becomes highlighted.",
        "actual": "Toggled support like, updated count to 1.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_042",
        "module": "CommunityPlaza",
        "name": "Verify author support notifications feed alert",
        "preconditions": "Another user has supported current user's card.",
        "steps": [
            "1. Trigger mock support action on user's post",
            "2. Navigate to user notifications tab."
        ],
        "expected": "Alert reads: 'Someone liked and felt supported by your community affirmation!'",
        "actual": "Interactive notification visible in the feed list.",
        "status": "Pass"
    },

    # --- Wellness Score (3) ---
    {
        "id": "TS_SEL_043",
        "module": "WellnessScore",
        "name": "Verify wellness score breakdown layout",
        "preconditions": "User navigates to 'Wellness Core'.",
        "steps": [
            "1. Check primary circular score dial.",
            "2. Inspect breakdown cards (Streak, frequency, positivity, journal length)."
        ],
        "expected": "Weighted scores sum up correctly, evaluation text matches.",
        "actual": "Individual wellness scores and category badges visible.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_044",
        "module": "WellnessScore",
        "name": "Verify wellness grade updates dynamically after activities",
        "preconditions": "User has logged mood and reflection.",
        "steps": [
            "1. Check initial score",
            "2. Log new mood entry and write reflection",
            "3. Return to Wellness Core."
        ],
        "expected": "Wellness score recalculates and increases accordingly.",
        "actual": "Score successfully increased from base level.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_045",
        "module": "WellnessScore",
        "name": "Verify action items recommendations navigation link",
        "preconditions": "Wellness Core view is open.",
        "steps": [
            "1. Scroll to 'Improvement Checklist'",
            "2. Click 'Practice breathing link'",
            "3. Confirm view redirects."
        ],
        "expected": "Viewport changes to guided breathing guide.",
        "actual": "Successfully navigated user to the Meditation view.",
        "status": "Pass"
    },

    # --- Notifications, Profile & Search (5) ---
    {
        "id": "TS_SEL_046",
        "module": "Notifications",
        "name": "Verify unread notification badge count updates",
        "preconditions": "User is viewing the dashboard; has unread notifications.",
        "steps": [
            "1. Look at 'Notifications' menu item",
            "2. Count the red badge numeric value."
        ],
        "expected": "Badge displays correct count matching unread rows in db.",
        "actual": "Unread counter badge updates automatically.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_047",
        "module": "Notifications",
        "name": "Verify marking notification as read",
        "preconditions": "User navigates to Notifications feed page.",
        "steps": [
            "1. Choose an unread notification marked by active borders",
            "2. Click the 'Mark as Read' check button."
        ],
        "expected": "Active borders fade, unread badge count in sidebar decreases.",
        "actual": "Notification row state updated to read.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_048",
        "module": "ProfileSettings",
        "name": "Verify switching light and dark UI themes",
        "preconditions": "User navigates to 'Profile & Settings'.",
        "steps": [
            "1. Click the 'Toggle Dark Mode' button",
            "2. Inspect container background class list",
            "3. Toggle again."
        ],
        "expected": "UI colors switch immediately, classes change context.",
        "actual": "Theme changed successfully; theme CSS applies classes.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_049",
        "module": "FuzzySearch",
        "name": "Verify search filter behavior on journal entries",
        "preconditions": "User has logged journals with various texts.",
        "steps": [
            "1. Click search field in Dashboard header",
            "2. Type search query 'tasks'",
            "3. Observe matching list cards."
        ],
        "expected": "List filters down to entries containing query term in text/tag.",
        "actual": "Results narrowed down matching target query term.",
        "status": "Pass"
    },
    {
        "id": "TS_SEL_050",
        "module": "ProfileSettings",
        "name": "Verify user account signout",
        "preconditions": "User is logged in.",
        "steps": [
            "1. Click 'Sign Out' in profile tab or sidebar badge",
            "2. Check redirection to landing page."
        ],
        "expected": "Auth token cleared from localStorage; redirected to landing page.",
        "actual": "Token removed, view reset to landing page.",
        "status": "Pass"
    }
]
