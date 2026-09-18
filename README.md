# NuNu Headquarters

Build for the NuNu campaign, derived from SleepingM4n's [No Place Like Home](https://github.com/SleepingM4n/no-place-like-home) module (v0.6.1). All credit for the base sheet, rules engine, stash, workshop and tests goes to Sleepingman. This repository exists to serve one game table. Foundry VTT 12, Cyberpunk RED Core 0.92.4.

## What this build adds

- **Claim a place.** On the HQ Info tab the GM picks the scene of the place from the world's scene list, then a starting Improvement (built in, free), starting HQ IP (default 40), rent and beds. The scene's name and picture become the HQ's and it becomes the HQ scene. A place without a scene cannot be claimed.
- **GM approval.** Every button a player presses (Humanity, Practice, Withdraw) sends the GM a popup instead of acting. Approve applies it to the sheet and the player gets a notification; Deny tells them. The GM's own clicks act at once. Improvement purchases stay GM-only.
- **Bonuses while at the HQ.** Set the HQ scene on the HQ Info tab. While a crew member's token is in that scene and the scene is the active one, the Lounge, Medbay, Studio and Evidence Wall skill bonuses sit on their sheet as an Active Effect (role-checked). Leave the scene, or activate another, and the effect is removed. The active GM's client keeps this in sync.
- **Training Area practice.** Practice puts +1 on the chosen combat skill as an Active Effect. Awarding HQ IP clears every practice bonus. Solos with the upgraded Training Area practice two skills.
- **Rent.** One number the GM edits by hand, split evenly across the crew and paid from their own sheets. Rent Reduction is applied by editing the number.
- **Improvements table.** One row per Improvement, Base and Upgrade columns, a tick where owned and a Buy button where not; click a name for the rule text.
- **Map pin.** Claiming drops a journal pin on the HQ scene that opens the sheet. Players need Display Notes on to see pins.
- **Crew vote.** The Actors sidebar gets an **HQ Improvement** button under Wizards' button (renamed Player Improvement). It opens the HQ sheet on the Improvements tab, where each player votes for what the crew buys next; character portraits show the tally. The GM sees a **Lock in** button on any row with votes, which buys it and clears the votes.
- **Calendar hand-off.** Healing and Hustle happen in the NuNu Calendar's downtime; this module exposes the HQ's healing bonus and Hustle mode through `game.modules.get("nunu-headquarters").api` so the calendar applies them. Heal, Hustle and lifestyle buttons were removed here.
- **Rule text** on the Improvements table is a hover tooltip on the name.
- **Workshop tab** only appears when a Tech is in the crew.

## Install and update

Install by manifest URL:

```
https://raw.githubusercontent.com/Mastermind1232/nunu-headquarters/main/module.json
```

New versions are GitHub releases with a `module.zip`; Foundry's Update button picks them up.

## Session 6 flow

1. Journal tab, Create Headquarters. Give the players Observer on it.
2. HQ Info, Claim a place: pick the scene, the starting Improvement, 40 IP, rent, beds.
3. Crew tab, drag the six sheets in, tick who lives there.
4. Spend the 40 HQ IP with the crew on the Improvements tab.

## Tests

```
node --test tests/*.test.mjs
```
