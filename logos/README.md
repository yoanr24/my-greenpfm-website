# logos/

Drop donor logo files here and the map will automatically use them instead of the text monogram badges.

## Naming convention

```
logos/<DonorId>.svg   (preferred — scalable)
logos/<DonorId>.png   (fallback)
```

**Rule:** replace every space in the donor ID with an underscore.

| Donor       | File name          |
|-------------|--------------------|
| AFD         | `AFD.svg`          |
| AfDB        | `AfDB.svg`         |
| EIB         | `EIB.svg`          |
| GIZ         | `GIZ.svg`          |
| LuxDev      | `LuxDev.svg`       |
| GGGI        | `GGGI.svg`         |
| World Bank  | `World_Bank.svg`   |
| IMF         | `IMF.svg`          |
| EU          | `EU.svg`           |

## How it works

The map chip JS tries to load `logos/<Id>.svg` first. If that request fails it
tries `logos/<Id>.png`. If that also fails, it falls back to the coloured
circle with a text monogram — so the map always renders correctly even with no
logos present.

Logos are displayed inside a 36×36 px area (within a 56 px diameter chip),
centred with `preserveAspectRatio="xMidYMid meet"`. Square or near-square SVGs
work best.
