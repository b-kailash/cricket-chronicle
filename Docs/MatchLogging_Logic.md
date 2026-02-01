
# Cricket Innings Log - Recording Logic

This document provides a detailed explanation of the data flow and logic used within the Cricket Innings Log application for recording a match.

## 1. Core State Management (`match-context.tsx`)

The entire application state is managed within a single, centralized system using React's Context and `useReducer` hook.

-   **`MatchProvider`**: This component wraps the entire application. It houses the `matchReducer` and the `match` state object.
-   **`match` State**: A single JavaScript object (`MatchData`) holds all information about the current match, including settings, inning data, over data, ball-by-ball details, and UI state like `isPaused`.
-   **`matchReducer`**: This is the heart of the state logic. It's a pure function that takes the current `state` and an `action` (e.g., `{ type: 'ADD_BALL', ... }`) and returns a *new* state object. It is the **only** place where the application's state is mutated.
-   **Actions**: Components do not directly change the state. They call functions from the `useMatch()` hook (like `addBall`, `startOver`), which in turn `dispatch` actions to the reducer. This ensures a predictable, one-way data flow.
-   **Persistence**: A `useEffect` hook inside the `MatchProvider` automatically saves the entire `match` state object to the browser's `localStorage` whenever it changes. On application startup, it attempts to load this data, allowing users to resume their session.

## 2. Match Lifecycle

### a. Match Setup (`match-setup-form.tsx`)

1.  The user fills out the "Setup New Match" form with team names, overs, officials, and toss details.
2.  Upon submission, the `createMatch` function is called from the `useMatch` hook.
3.  This dispatches a `CREATE_MATCH` action with the form settings as its payload.
4.  The `matchReducer` handles this action by creating the initial `MatchData` object. It determines the batting and bowling teams for the first inning based on the toss result and creates the first `InningData` object.
5.  The user is then programmatically redirected to the main tracking page for Inning 1.

### b. Starting an Inning (`inning-tracker.tsx`)

1.  The user clicks the "Start Inning" button.
2.  A dialog appears, prompting the user to select the umpire who will officiate the first over.
3.  Upon confirmation, the `startInning` function is called with the selected umpire's name.
4.  A `START_INNING` action is dispatched. The reducer updates the current inning by setting its `startTime` and `startingUmpire`.

### c. Starting and Ending an Over (`over-tracker.tsx`)

1.  **Start Over**: When the user clicks "Start Over X", the `startOver` function is called.
2.  A `START_OVER` action is dispatched. The reducer adds a new `OverData` object to the current inning. It sets the `startTime` and determines the correct `umpireName` by alternating from the previous over (or using the inning's `startingUmpire` for the first over). It also sets the `currentOverId` in the root of the state, so the app knows which over is active.
3.  **End Over**: When the user clicks the "End Over" button inside the `BallLogger` modal, the `endOver` function is called.
4.  An `END_OVER` action is dispatched. The reducer finds the currently active over, sets its `endTime`, and clears the `currentOverId` from the state.
5.  After ending an over, the reducer immediately checks if the inning is now complete (e.g., overs limit reached, all wickets down, or target reached in the 2nd innings). If so, it automatically triggers the logic to complete the inning.

## 3. Ball Recording and Scoring Logic

This is the most critical part of the application's logic, centered in the `matchReducer`.

### a. The Recording Flow (`ball-logger.tsx` & `over-tracker.tsx`)

1.  The `BallLogger` component is the form for inputting runs, extras, wickets, and penalties.
2.  When the user submits the form ("Record Ball"), a callback in `OverTracker` is triggered.
3.  **Wicket Flow**: If the "Wicket" checkbox is checked, a secondary dialog (`WicketDetails`) is shown. The `BallInputData` is held temporarily. Only after the user confirms the wicket details does the process continue.
4.  The `addBall` function from the context is called. This dispatches an `ADD_BALL` action.

### b. Inside the Reducer (`ADD_BALL` action)

1.  **Find Active Over**: The reducer uses `state.currentInningIndex` and `state.currentOverId` to locate the exact inning and over being modified.
2.  **Reprocess All Over Balls (`_reprocessOverBalls`)**: This is a key step for data integrity. The reducer takes all *existing* balls in the over, adds the *new* ball data to the end of the list, and sends the entire list to the `_reprocessOverBalls` helper. This function iterates through the complete list from the beginning and:
    -   Assigns the correct sequential `ballInOver` number (1, 2, 3...).
    -   Assigns the correct `validBallNumber` (1, 2, 3...) only to fair deliveries, skipping wides and no-balls.
    -   Generates a new, unique ID for the new ball.
    -   Uses `calculateDisplayValue` to create the string representation (e.g., "4", "3WD", "W").
    This ensures that even if balls are edited or removed in the future, the sequence numbers are always recalculated correctly.
3.  **Recalculate All Scores (`_recalculateAllScores`)**: After the over's balls are updated, the reducer calls this master scoring function.
    -   **Step 1: Inning-Scoped Totals**: The function first calculates totals for each inning independently. It iterates through every ball in an inning and sums up the runs, wickets, and any penalties (`battingTeamPenaltyRuns`, `bowlingTeamPenaltyRuns`) that belong to that inning.
    -   **Step 2: Cross-Inning Penalty Application**: This is where fielding-side penalties are handled. The final `totalScore` for an inning is calculated as: `(Runs from balls in this inning) + (Batting penalties in this inning) + (Bowling penalties awarded to this team while they were fielding in the *other* inning)`. This ensures that 5 penalty runs awarded to the bowling team in Inning 1 are correctly added to that team's batting score in Inning 2 (or their final score if they don't bat again).
4.  **Check for Inning Completion**: Finally, the reducer checks the newly calculated `totalScore` and `totalWickets`. If the target is reached or all wickets have fallen, it automatically triggers the logic to complete the inning.

## 4. Editing an Over (`over-tracker.tsx`)

The editing process leverages the robust recalculation logic.

1.  The "Edit Over" modal displays each ball's `displayValue` in a text input.
2.  When the user saves changes, the `updateOverBalls` context function is called.
3.  It dispatches an `UPDATE_OVER_BALLS` action with the new array of string values.
4.  **Inside the reducer**:
    -   It uses `parseBallDisplayStringToInput` to convert each edited string back into `BallInputData`.
    -   It then follows the **exact same logic as `ADD_BALL`**: it calls `_reprocessOverBalls` to rebuild the `BallData[]` array for the over and then calls `_recalculateAllScores` to update the entire match's totals. This ensures that any change, no matter how small, triggers a full and accurate recalculation of the entire match state.

## 5. Data Import/Export

-   **Export (`exportMatchData`, `saveMatchToFile`)**: These functions are simple. They take the current `match` state object as is and format it, either into a comprehensive CSV or by using `JSON.stringify` for a `.json` file backup.
-   **Import (`loadMatchFromFile`, `importMatchFromCsv`)**: These functions read the selected file, parse it into the `MatchData` structure, and then dispatch a single `LOAD_MATCH` action. This action completely replaces the existing state in the reducer with the newly parsed data, effectively loading a new match.
