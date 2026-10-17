# App icon

`redbird-app-icon-source.png` is the owner's 1254x1254 artwork (rounded square, transparent corners).
`pack/` holds the files from the owner's icon pack that the build uses (the rest of the pack is not needed):
the 1254 master, `android/mipmap-{mdpi,xhdpi,xxxhdpi}/ic_launcher.png` and `playstore.png`.

`node scripts/assets/make-app-icons.mjs` regenerates every icon from them (see the header of that script for what each one is).
The pack's iOS PNGs are not used: they are flattened on white corners, and iOS applies its own mask.
