# No Place Like Home ” Foundry Headquarters

Unofficial shared Headquarters sheet based on the **No Place Like Home** Cyberpunk RED DLC, August 2024. Targets **Foundry VTT 12 stable (user build 343)** with **Cyberpunk RED Core 0.92.4** (`cyberpunk-red-core`). This is an HQ record in Journals, not a replacement for an edgerunner Actor sheet.

## Install

In Foundry's **Add-on Modules â†’ Install Module**, paste this manifest URL:

```text
https://github.com/SleepingM4n/no-place-like-home/releases/latest/download/module.json
```

For a manual installation:

1. Close Foundry. Extract `no-place-like-home.zip` into your Foundry user data `Data/modules/` folder.
2. Check that the result is `Data/modules/no-place-like-home/module.json` (no double nesting).
3. Start Foundry, open your Cyberpunk RED world, and enable **No Place Like Home - Headquarters** in **Manage Modules**.
4. Open **Journal Entries** and click **Create Headquarters** as GM.
5. Enter the HQ name, location, crew, description, original rent and original bed count. Award the crew's accumulated HQ IP, then purchase its improvements.
6. Right-click the journal entry, choose **Configure Ownership**, and give the appropriate players **Observer** access. New HQs are private until shared. Players can read and use benefit actions on characters they own; the GM makes crew-approved purchases.

## Custom improvements and upgrades (0.5.2)

As GM, open **Improvements & Upgrades â†’ Add custom improvement**. Enter a name, the base benefit, and one upgrade benefit per line in purchase order (up to 50). Leave upgrades blank for a base-only improvement. Saving adds a new card alongside the twelve default options without spending IP. Use **Acquire** and **Upgrade** to purchase each tier at the HQ's shared purchase cost.

Acquired custom benefits appear in **Active Crew Benefits** while the crew has access. Their effects are descriptive and must be applied manually. **Edit custom** changes the definition and can add further tiers; it cannot remove tiers already purchased. **Lost** clears purchases but keeps the definition. **Delete custom** removes the custom card. Loss, deletion and HQ destruction do not refund spent IP. Creation, edits, purchases, losses and deletion are logged. Existing HQs need no migration.

## Updating to 0.6.1

Close Foundry and replace the existing `Data/modules/no-place-like-home/` module files with the folder in the new ZIP. Restart Foundry and reload each player's browser. Existing Headquarters data is retained; no migration or recreation is needed.

Version 0.3.1 displays character-sheet portraits in crew slots and places Active crew benefits before Improvements & upgrades.

## Tabbed sheet (0.5.1)

The HQ name and image banner stays visible above six tabs:

1. **HQ Info** â€” location, crew name/notes, description, rent, beds, access settings, HQ IP totals and Award HQ IP.
2. **Crew** â€” six portraits, drag-and-drop guidance, crew IP/money awards, garage and shared stash.
3. **Active Crew Benefits** â€” healing, Humanity, Hustle and other benefits, plus project/training notes.
4. **Improvements & Upgrades** â€” custom purchase cost and all improvement/upgrade cards.
5. **Workshop** — blueprint projects, work sessions, attempts and audit history.
6. **Recent Activity** â€” activity log and the GM's HQ destruction control.

Uses Foundry v12's native sheet tabs, starting on HQ Info. Existing HQ data, player permissions and action behavior are preserved. Tab labels also support Enter/Space keyboard activation.

## HQ image, crew and garage

### Award crew IP (0.4.0)

**Award crew money (0.4.1):** the adjacent GM-only button uses the same crew selection, Select all / Clear controls and reason field. Enter the Eurobucks amount **per selected character**. Each selected character receives the full award in their Eurobucks balance, with the reason in their ledger. Only characters linked in the crew slots are eligible; the garage vehicle is excluded. This awards new money rather than withdrawing from the stash. The IP button and other features retain their behavior.

As GM, click **Award crew IP** directly below the six crew slots. The popup lists only linked Character actors, with checkboxes, Select all / Clear controls, and a selected count. Enter a positive whole **IP per selected character** amount and a **reason**, then click **Award IP**. Each selected character receives the full amount, and the reason is saved in their Improvement Points ledger. The garage sheet, unlinked characters, deleted links and NPC mooks are excluded (mooks have no character IP ledger in this system).

The existing **Award HQ IP** button still manages the HQ pool separately. All other features, maker credit and Foundry v12 compatibility remain unchanged. If a character update fails, a notification lists successful and failed recipients so successful awards are not accidentally repeated. Use one GM award operation at a time across clients.

- **HQ image:** as GM, click **Choose image** at the top-right corner. Foundry's image picker lets you select an existing image or upload one if your host permits uploads. Removing an image clears the reference, not the image file.
- **Crew:** the GM drags Actors from the Actors directory into any of six slots. Each slot shows the Actor's character-sheet portrait. Character and mook Actors are supported, with one link per Actor. Clicking a portrait opens its sheet with the viewer's existing permissions. The Ã— unlinks it without deleting the Actor. Existing crew text remains in the Crew name / notes field.
- **Garage:** drag a vehicle Item (from the Items directory or an actor's inventory), or an Actor representing a vehicle, onto the garage slot. Cyberpunk RED 0.92.4 uses vehicle Items rather than a separate vehicle Actor type. Clicking opens the linked sheet. This reference does not purchase the Garage improvement or transfer ownership of a vehicle.
- Links store world UUIDs; compendium documents must be imported first. Deleted links display a missing-sheet notice. Linking never grants access to a previously private character or vehicle.

## Shared item storage and Eurobucks

1. Give the crew **Observer** access to the HQ journal, then click **Create shared stash** as GM. This creates one native Cyberpunk RED **Container** Actor in Stash mode and links it to the HQ. Players with HQ Observer access receive Owner permission on that stash, as required by the system's inventory controls. Other players receive no access by default.
2. Click **Open item storage**. Players drag items from their character inventory into the native stash sheet. To retrieve items, select their character as the stash's trade partner and use the system's item transfer controls. Items are free in Stash mode. Quantity, attachments and installed-item restrictions use the native system workflow. This opens a separate native container sheet rather than copying inventory into journal flags.
3. Use **Deposit eb** or **Withdraw eb** on the HQ sheet to choose an owned character and transfer a positive whole amount. These buttons update both balances and both ledgers; they reject insufficient funds and attempt a refund if the recipient update fails. Use these controls for transfers rather than directly editing a balance in the container sheet.

HQ ownership changes synchronize stash access when an active GM is present. **Sync player access** repeats that synchronization manually. Storage remains a real Actor in the Actors directory, and is not deleted when the HQ is destroyed, unlinked or deleted. HQ access-loss flags do not lock the stash; the GM can restrict the stash's ownership separately. Members trusted with stash Owner permission can manage its entire inventory.

Use one money transfer at a time across players. The local client prevents overlapping stash transfers, but Foundry does not provide a transaction lock across different clients; simultaneous direct edits or transfers can conflict. No GM needs to be online for ordinary storage use after permissions are configured.

Version 0.3.0 adds unit coverage for slot limits, links, permission handling, stash creation, balanced deposits/withdrawals and refund failure. Browser simulation covers the new layout, player link opening and transfers, GM crew drops and image selection. Test native item transfers inside Foundry after updating; the actual Cyberpunk system container UI is not available in the browser simulation.

## Character benefit actions

The **Active crew benefits** section has three buttons. Players need Observer access to the HQ journal and Owner permission on a **Character** actor. Each action opens a character selector showing only owned characters; mooks and other actor types are excluded. Lost HQ access disables the actions.

- **Healâ€¦**: choose a character and enter the number of completed healing days. Restores `(current BODY + active HQ healing bonus) Ã— days`, capped at the character's maximum HP. Medbay and Morale healing bonuses stack. Stabilization, sufficient rest and critical injury treatment are still adjudicated normally.
- **Roll & restoreâ€¦**: roll the current monthly Morale Humanity benefit and add it to the selected character. Uses the system's cyberware-adjusted maximum Humanity and updates EMP. Available from Morale upgrade 1; upgrades 4 and 9 replace the formula. This is an in-game monthly benefit: there is no automatic calendar or once-per-month lock, so use it once per eligible month.
- **Roll & earnâ€¦**: choose a character, then an owned Role item. Rank is read from the item. Standard core Roles are recognized by name, original translated name or compendium source; a table selector supports renamed/custom Roles. Rolls the core Hustle table for one seven-day period. Morale upgrades 6â€“7 let the player choose either of two results; upgrades 8â€“10 pay both. The money and a transaction are added together to the character's Eurobucks ledger. Cancelling the result choice pays nothing; the rolled dice remain in chat.

Dice and applied results are posted to chat. The buttons block double-clicks while an action runs, and character actions are serialized within a client. Avoid simultaneous edits to the same character from different clients. Downtime is not advanced automatically, and the module does not check whether healing days overlap a Hustle week.

You can also create a sheet with a Script macro:

```js
await game.modules.get("no-place-like-home").api.createHQ();
```

The optional sheet is registered only for Journal Entries. Ordinary journals retain their normal sheet. An existing empty journal can use it through its sheet configuration; existing journal pages are retained but are not displayed in the HQ sheet.

## Rules supported

**Custom purchase cost (0.5.0):** the GM can enter one price in **Cost for every improvement or upgrade (HQ IP)** under Improvements & upgrades. This price applies to every future improvement and upgrade on that HQ, including repeated upgrades. It defaults to 40 and accepts non-negative whole numbers (0 permits free purchases). Purchase buttons, confirmation dialogs, affordability checks, deductions and purchase logs use the chosen price. Previous spending and existing upgrades remain unchanged. Existing HQs automatically default to 40 without a migration.

- All twelve improvements default to 40 HQ IP, with a customizable shared purchase cost; ordinary improvements have one upgrade.
- Morale Boost permits ten upgrades. The benefits panel resolves Humanity and Hustle replacements, LUCK increases, and Medbay/healing stacking.
- Rent Reduction requires rent and caps extra beds at the original bed count. Enter the reduced monthly rent **manually**, using the core rulebook Real Estate categories and the GM's assessment of the space. The module does not infer a category from a rent amount.
- HQ IP is awarded once per crew, equal to the Group-column mission award. Character IP is untouched.
- Lost access suspends the benefits panel. The **Lost** button removes an improvement and its upgrades without refund. Use this for a Garage car destroyed beyond repair.
- Losing an upgraded Workstation blocks other purchases until both ranks are restored, or the GM records the Team Member's departure.
- HQ destruction removes all purchases and suspends access. Unspent IP stays with the crew; rename and update the record when establishing a replacement HQ.
- Faction HQ mode blocks crew IP spending. For a GM-authored faction record, populate improvements before enabling faction mode; availability remains the GM's decision.
- An activity log records awards, purchases and losses. Notes hold training expiry, project progress, NET Architecture details, selected Team Member and the custom tenth Morale benefit.

## Scope and validation

The module stores HQ data in JournalEntry flags and does not patch the Cyberpunk system. Character benefit actions write HP, Humanity/EMP and Eurobucks to the selected actor. It does not apply other effects, create vehicles/NET assets or automate housing payments. Training expiry and other role/skill/context conditions must be applied manually. Half-d6 Humanity recovery rounds down.

Only the GM edits the sheet. Use one GM editor at a time: Foundry flag updates are not database transactions across multiple clients. Back up your world before editing; losses have confirmation prompts but no built-in undo. Existing HQs can be set up by awarding their historical purchase cost plus current unspent IP and buying their existing improvements.

Automated tests cover HQ rules plus owned-character filtering, permission checks, capped healing, Humanity/EMP, all core Hustle payout rows/rank bands, Morale variants, cancellation, ledger preservation and failed writes. Character field paths and ledger format were checked against the system's v0.92.4 source. Browser checks use a simulated Foundry environment; a live Foundry world smoke test is still required for the new actions.

Run with Node.js:

```sh
node --test tests/*.test.mjs
node --check scripts/module.mjs
```

In Foundry, verify creating/reopening a record, metadata persistence, purchasing a Garage with 40 IP, player Observer access, access loss/restoration, and a browser reload. Check the browser console for errors. Test with a disposable HQ first.

For 0.2.0, test as a player with Observer HQ access: heal an owned damaged character for two days, restore Humanity near its cap, and Hustle with one of its Role items. Verify HP, Humanity, EMP and the Eurobucks ledger after reloading. An unowned character must not appear in the selector. Check that loss of HQ access disables the three buttons.

## Credits

Module maker: **Sleepingman**. The module manifest declares Foundry VTT 12 as its minimum, verified and maximum version.

Rules: **No Place Like Home**, writing/design by James Hutt and J Gray, Â© 2024 R. Talsorian Games. Cyberpunk is a registered trademark of CD Projekt Red S.A. This is an unofficial fan tool with original code and paraphrased reminders, not an endorsed product. The DLC PDF, artwork and fiction are not bundled. Consult your own DLC and Cyberpunk RED core rulebook for complete rules.

Foundry API references: https://foundryvtt.com/api/v12/classes/client.DocumentSheet.html and https://foundryvtt.com/api/v12/classes/client.DocumentSheetConfig.html.

System integration reference: https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core/-/tree/v0.92.4/src/modules/actor. Hustle payout mechanics were checked against the user's Cyberpunk RED core rulebook, pp. 382â€“385; the original table prose and PDF are not distributed.

## Monthly lifestyle payment (0.5.3)

Use **Active Crew Benefits → Pay lifestyle** to choose a character you own, review the detected lifestyle and confirm payment for one month. Matching ignores case and surrounding spaces. The character must have an item named Kibble (100eb), Generic Prepak (300eb), Good Prepak (600eb), or Fresh Food (1500eb). If multiple types are present, select one; duplicate items do not multiply the charge.

An active Morale Boost subtracts 50eb, resulting in 50/250/550/1450eb respectively. Without Morale Boost, the full price applies. The payment updates the Eurobucks balance and ledger together and posts a chat receipt. Insufficient funds, missing items, lost HQ access or revoked permissions stop payment. Each click pays one month; no calendar or once-per-month limit is enforced. Existing features and HQ data are retained.

2026-09-08 — Changelog: Added Pay lifestyle to select an owned character, detect their lifestyle item, apply the 50eb Morale Boost discount, and debit the monthly cost from their Eurobucks ledger.

## Rent payments (0.5.4)

The Monthly rent square on HQ Info includes Pay. Monthly rent equals Original monthly rent minus Reduced rent (discount), with a minimum of zero, regardless of improvement ranks. Review existing Reduced rent values after updating: they now represent discounts, not final rent.

Payment confirms one month and debits only the native stash created and linked to this HQ. Players need HQ Observer and stash Owner permissions (Sync player access). No character is charged. Insufficient funds, missing or unrelated stashes, changed rent or revoked permissions prevent payment. Payments are recorded in the stash ledger. There is no automatic calendar lock. Use one stash payment or transfer at a time across clients.

2026-09-08 - Changelog: Added Pay inside the Monthly rent square on HQ Info; rent is Original monthly rent minus Reduced rent (minimum zero), and payment debits only the linked HQ stash. Existing Reduced rent values now represent discounts.


## Workshop projects (0.6.0)

The **Workshop** tab adds invention, fabrication and upgrade tracking without changing the existing HQ benefits, stash, rent or awards. Existing HQs need no migration. Records are saved in a separate `workshop` flag on the HQ journal.

### Workflow

1. Add the Tech's character to one of the six **Crew** slots. The garage does not count. Players need Observer access to the HQ and Owner access to the character. The character must have a ranked Tech/Maker role and ranks in the specific Expertise used. The Workshop does not grant Maker abilities to other roles.
2. Choose **New project**. Enter its phase, price category, item value, repair skill, image path or URL, components and costs, functions/rules and special features. Players propose projects; the GM approves them before work begins. GM-created projects are approved immediately. Component costs are a planning ledger, not an automatic stash or character debit.
3. Use **Record work session**. Choose a Tech, a primary project, optional bonus projects, time actually worked, a time unit, an in-world date and notes. Each selected project receives the same time exactly once. Projects must belong to that Tech and have the appropriate Expertise. A basic Workshop allows two projects total; an upgraded Workshop allows three. Off-site work or an HQ without a Workshop permits one. Lost HQ access prevents on-site work. Sessions cannot exceed the earliest selected project's remaining target; split the session at that point.
4. Roll the Maker check with the system's normal RED critical rules: TECH + relevant repair skill + the appropriate Maker Expertise + 1d10. The GM uses **Record check outcome** to enter its final total. Success must exceed the DV. Success needs the full work target; failure needs at least half of it. Merely filling the progress bar does not complete the project.
5. A successful invention becomes a blueprint. **Create linked prototype** starts a separate fabrication (or upgrade) project with zero progress, its own DV/target and attempts. Another eligible crew Tech can be assigned during creation. No actor Item is created automatically.
6. Failed work remains in the attempt history and work ledger. **New attempt** starts at zero; previous work is never carried into a retry. Any work recorded beyond the failure's half-time threshold also remains lost work. Record only the time actually consumed. Materials are not consumed by this tracker; the GM handles materials and the finished item's creation.

Dates are labels only. For a 14-day project, seven days of work, a gap, five days of work, another month-long gap and two days of work add up to exactly 14 days. Interruptions add nothing. Time is stored as whole minutes. The conversion convention is 60 minutes/hour, 24 hours/day and seven days/week. Fractional durations are supported when they produce whole minutes. This is an explicit duration conversion, not a claim that every character works 24 hours per calendar day: enter actual work time in hours when appropriate. **Month length** defaults to 30 days and can be changed by the GM. Existing attempt targets and recorded sessions retain their original minute amounts.

### Default DV and work targets

| Price category | DV | Work target |
| --- | --- | --- |
| Cheap / Everyday | 9 | 1 hour |
| Costly | 13 | 6 hours |
| Premium | 17 | 1 day |
| Expensive | 21 | 1 week |
| Very Expensive | 24 | 2 weeks |
| Luxury | 29 | 1 crafting month |
| Super Luxury | 29 | 1 crafting month per started 10,000 eb |

Invention normally starts at Expensive. The GM can override its category minimum, DV, required work or a rolled outcome with a reason. The preview shows category defaults; explicit GM override fields take precedence. The default price field follows the selected category, and Super Luxury prices can be entered manually. The GM approves invention functionality, balance, skill, costs and feasibility. Workshop capacity follows the [official No Place Like Home DLC](https://rtalsoriangames.com/wp-content/uploads/2024/08/RTG-CPR-DLC-NoPlaceLikeHome.pdf); the DV/time reference is the [provided Maker rules reference](https://homebrewery.naturalcrit.com/share/GTfdEcccNB5K). The submitted blueprint PDF informed the form layout; it is not included in this module.

### Corrections, permissions and saving

The GM can edit unstarted attempts, change future month defaults, override check outcomes, and void erroneous sessions with a reason. Voiding keeps the original entry visible and removes its credit from every affected project. Record a replacement session afterward. Resolved attempts must be reopened before their work can be voided. A successful invention with linked prototypes cannot be reopened, preserving their blueprint source. To change a started target, first reopen if necessary and void the affected work, then edit and record the corrected work. Previous specifications and outcomes remain in the saved audit. The ledger, attempts and audit are not pruned.

An active GM is required for saving. Player requests use private Foundry chat receipts addressed to the player and the elected active GM. That GM rechecks crew membership, actor ownership, Expertise, approval and Workshop capacity, then saves every selected project's credit in one journal update. Repeated delivery of the same request cannot double-credit work. Simultaneous requests on the same HQ are queued. On failure, the chat receipt reports the error; if a request stays pending, check with the GM before submitting again. Existing HQ purchase writes use a different flag and cannot overwrite Workshop records.

Validation: all 93 automated tests pass. Engine/service tests cover interruptions, separate phases, capacities, duplicate requests, permissions, failure/retry history, corrections, serialization, queued saves and write errors. Browser simulations cover all six tabs plus project creation, session entry, failure, retry and player controls. These are simulations, not a live multiplayer Foundry v12 session. Test this ZIP in a copy of your world before relying on it for a campaign. Use the installation manifest above to obtain the latest published release.

2026-09-11 - Changelog: Added the Workshop tab with crew Tech projects, blueprint details, work-session banking for two or three projects, separate invention/prototype attempts, GM approval and overrides, configurable crafting months, and persistent work/failure/correction history; all previous HQ features retained.


## Workshop folders, deletion and prototype items (0.6.1)

Workshop records are organized into three collapsible folders: **Inventions**, **Prototypes**, and **Work Sessions**. Fabrication and upgrade projects appear in Prototypes. Each folder shows its record count and keeps its open/closed state while the HQ sheet remains open, including after saves. Existing records are grouped automatically; no migration is required.

The GM can use **Delete project** on an invention or prototype, or **Delete work session** in Work Sessions. The dialog explains the effect and requires a reason. Deleted entries disappear from their folders; the audit keeps a snapshot and the reason. Deleting a project removes only its own work credits and attempts, leaving other projects' progress intact. Work sessions retain the deleted project's name for context. If an invention has linked prototypes, they remain with their progress and the source invention's name.

Deleting a work session removes its time from all affected projects. Any affected current resolved attempt reopens; dependent prototypes return to active status and need GM approval after their source invention succeeds again. Previous outcomes are retained in the deletion audit. Historical failed attempts stay failed, with their recorded lost time adjusted. Deleting an already voided session does not change progress or outcomes.

Each prototype/fabrication/upgrade card has a **Prototype item** slot labelled **Drag and drop an Item here**. Drop an Item from the Items directory, a character's inventory, or a compendium. Its image and name appear; click it to open its item sheet. The GM or the project's eligible Tech owner can link, replace or remove the link. The requester must be able to view the item. This creates a reference only: it does not move, duplicate, award or delete the Foundry Item. Missing or restricted links are labelled, and can be replaced or cleared by an authorized user. Item access is checked again when opening the sheet.

Validation includes 93 automated tests and browser simulations of folders, retained folder state, item drop/open/unlink, invalid drops, GM deletion and player restrictions, alongside existing HQ and Workshop regression checks. Live multiplayer Foundry testing is still required. Author Sleepingman; Foundry v12 only. 

2026-09-12 - Changelog: Added collapsible Inventions, Prototypes and Work Sessions folders, GM-only project/session deletion with progress recalculation and audit history, and labelled drag-and-drop prototype item slots with image, open-sheet and unlink controls.
