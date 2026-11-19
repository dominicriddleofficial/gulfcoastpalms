# Photos sent by the owner

Source: the owner of Gulf Coast Palms, sent directly on 18 November 2026 as content for
the home page: four photos and two videos. These are the camera files, not copies saved
from a web page.

Before they were added here the camera data (time, phone model and any location) was
taken out of each file. The pictures themselves were not changed: nothing is retouched,
generated or enlarged, and the colour of the video frames is as the videos have it.

| File | What it is | Size |
| --- | --- | --- |
| `date-palm-drive-before.jpg` | A date palm beside a paver driveway before the work: a heavy crown, ferns and old growth on the head, a ladder against the trunk and a chainsaw on the grass. | 1512 x 2016 |
| `condo-night.jpg` | The white five-story condo building in Destin after dark, its trimmed palms lit from below, the truck in front. The same frame as `src/assets/gallery/job-11.jpeg`, a little larger. The opening screen's first scene is cut from this photo. | 1242 x 2208 |
| `estate-from-the-air.jpg` | The waterfront estate in Gulf Breeze from the air (the property in `src/assets/gallery/job-2.jpeg`). One frame of the drone video, the one the opening screen's clip starts on. | 1080 x 1920 |
| `condo-palm-row.jpg` | A row of trimmed sabal palms lit from below along the condo's wall at night. One frame of the night walk-through video. Used in the homepage's commercial section. | 720 x 1280 |
| `date-palm-drive-after.jpg` | The same palm afterwards (same slatted fence, white garage and drive): crown trimmed, head diamond cut, trunk cleaned. First of the completed projects on the homepage. | 1932 x 2576 |
| `five-sabals-dusk.jpg` | Five trimmed sabal palms in a mulch bed in front of a single-story home at dusk. Cut from a taller, wider frame to leave out a power line across the sky and a person standing at the right-hand edge. | 1315 x 1500 |

The before and after were taken from slightly different spots.
`scripts/build-redesign-media.mjs` cuts the before photo so the trunk is the same size
and in the same place as in the after photo (`src/assets/redesign/date-palm-drive-before.jpg`).

The condo and the estate are jobs already on the Completed Jobs page, which records
them in Destin and Gulf Breeze. No city is recorded for the date palm or the five
sabals, so the site does not name one. When the office confirms the town for a job, add
it to that project in `src/redesign/data/projects.ts` and the page links it to the right
service-area page by itself.

The videos themselves are not kept in the project (they are large). Seven seconds of
the drone video play in the opening screen: `public/media/redesign/hero-air-540.mp4`
and `hero-air-720.mp4`, made with the ffmpeg commands noted in
`scripts/build-redesign-media.mjs`. The night walk-through is hand-held and moves too
much to play as a clip, so only the one sharp frame above is used.

Sent at the same time and not used: a photo that is not of tree or palm work.
