# wavegen, a javascript wavetable generator
I did not create the base for the tool - it has been hosted on an old fc2 website. I cleaned it up (with the help of DEFENSE MECHANISM) and reposted it on its own while adding a variety of other features.

# New features:
- Added distortion options similar to LSDj - Clip, Fold, Wrap, and Absolute (absolute can be enabled alongside all other modes, leading to 8 distortion modes total)
- Graph is now a proper graph. This is still a bit janky but it'll be sorted out soon(tm).
- Help page is (will be, really) refactored and rewritten to be more useful and concise, on top of being integrated on the main page.

# Roadmap:
- [x] Implement clipping for all output modes (currently it's available for everything sans float).
- [x] Implement a distortion selector (off/clip/fold/wrap/absolute checkmark).
- [x] Fix the broken distortion modes.
- [x] Add comments to the code as needed.
- [x] Get rid of help page, embed it as part of the main page.
- [x] Replace graph view with an actual graph view that's easier to look at.
- [ ] Tweak the graph view to not be interpolated linearly (perhaps implement it as waveform bars or something with rectangles in the canvas?)
- [ ] Clean up the help-page even more to add a more comprehensive breakdown of how the program works.
- [ ] Make the help page look nicer.
- [ ] Separate the help from the examples - add a link to the top for examples, a quick shortcut to get there fast.
