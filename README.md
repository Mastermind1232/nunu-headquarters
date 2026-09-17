# NuNu Headquarters

Private build for the NuNu campaign, based on SleepingM4n's No Place Like Home module (v0.6.1, unlicensed; not for redistribution). Foundry VTT 12, Cyberpunk RED Core 0.92.4.

## What this build adds

- **Claim a place.** On the HQ Info tab the GM picks the scene of the place from the world's scene list, then a starting Improvement (built in, free), starting HQ IP (default 40), rent and beds. The scene's name and picture become the HQ's and it becomes the HQ scene. A place without a scene cannot be claimed.
- **GM approval.** Every button a player presses (Heal, Humanity, Hustle, Pay lifestyle, Practice, Pay rent, Withdraw) sends the GM a popup instead of acting. Approve applies it to the sheet and the player gets a notification; Deny tells them. The GM's own clicks act at once. Improvement purchases stay GM-only.
- **Bonuses while at the HQ.** Set the HQ scene on the HQ Info tab. While a crew member's token is in that scene and the scene is the active one, the Lounge, Medbay, Studio and Evidence Wall skill bonuses sit on their sheet as an Active Effect (role-checked). Leave the scene, or activate another, and the effect is removed. The active GM's client keeps this in sync.
- **Training Area practice.** Practice puts +1 on the chosen combat skill as an Active Effect. Awarding HQ IP clears every practice bonus. Solos with the upgraded Training Area practice two skills.
- **Residents.** Each crew slot has a "lives here" box. The crew tab shows how many live in and the monthly rent.
- **Workshop tab** only appears when a Tech is in the crew.

## Install and update on The Forge

Drag the local `UPLOAD TO FORGE/NuNu/Modules/nunu-headquarters` folder into `modules` in the Forge Assets Library (choose Don't Unzip). First time: install in Foundry by pasting the manifest URL `https://assets.forge-vtt.com/6a7ca306f6a96908b438164c/modules/nunu-headquarters/module.json`. After that, drag the two files in again and press Update in Foundry's module list.

## Session 6 flow

1. Journal tab, Create Headquarters. Give the players Observer on it.
2. HQ Info, Claim a place: pick the scene, the starting Improvement, 40 IP, rent, beds.
3. Crew tab, drag the six sheets in, tick who lives there.
4. Spend the 40 HQ IP with the crew on the Improvements tab.

## Tests

```
node --test tests/*.test.mjs
```
