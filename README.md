# NuNu Headquarters

Private build for the NuNu campaign, based on SleepingM4n's No Place Like Home module (v0.6.1, unlicensed; not for redistribution). Foundry VTT 12, Cyberpunk RED Core 0.92.4.

## What this build adds

- **Claim this place.** On the HQ Info tab the GM picks one of the four Session 6 places (Ganic Gains Gym, Level 16 North, The Red Club, The Scavenger Site). One click sets the name, location, rent and beds, builds in that place's free Improvement, and awards the crew 40 HQ IP.
- **GM approval.** Every button a player presses (Heal, Humanity, Hustle, Pay lifestyle, Practice, Pay rent, Withdraw) sends the GM a popup instead of acting. Approve applies it to the sheet and the player gets a notification; Deny tells them. The GM's own clicks act at once. Improvement purchases stay GM-only.
- **Bonuses while at the HQ.** Set the HQ scene on the HQ Info tab. While a crew member's token is in that scene and the scene is the active one, the Lounge, Medbay, Studio and Evidence Wall skill bonuses sit on their sheet as an Active Effect (role-checked). Leave the scene, or activate another, and the effect is removed. The active GM's client keeps this in sync.
- **Training Area practice.** Practice puts +1 on the chosen combat skill as an Active Effect. Awarding HQ IP clears every practice bonus. Solos with the upgraded Training Area practice two skills.
- **Residents.** Each crew slot has a "lives here" box. The crew tab shows how many live in and the monthly rent.
- **Workshop tab** only appears when a Tech is in the crew.

## Install on The Forge

Games Configuration, Import Wizard, ZIP File tab, turn off "Install found packages from the Bazaar", pick `UPLOAD TO FORGE/NuNu/Modules/nunu-headquarters/module.zip`, Analyze, Import. Restart the Foundry server, then enable the module in the world. Updates go the same way; the module has no manifest URL, so Foundry's update button ignores it.

## Session 6 flow

1. Journal tab, Create Headquarters. Give the players Observer on it.
2. HQ Info, pick the place, Claim this place.
3. HQ Info, set the HQ scene. Crew tab, drag the six sheets in, tick who lives there.
4. Spend the 40 HQ IP with the crew on the Improvements tab.

## Tests

```
node --test tests/*.test.mjs
```
