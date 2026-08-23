# Tagging the Instagram links

Instagram is the best channel this store has. In the first month it sent 51
sessions at 61% engagement, against 31% for everything arriving untagged. It is
also the channel we can see the least of, because only some of the links carry
tags.

Right now the same traffic lands four different ways:

| How it arrives in GA4 | Sessions | Why |
|---|---|---|
| `ig / social` | 32 | link carried UTM tags |
| `l.instagram.com / referral` | 13 | no tags, Instagram's link wrapper |
| `instagram.com / referral` | 4 | no tags |
| `(direct) / (none)` | unknown | in-app browser dropped the referrer |

The last row is the problem. Some unknown share of the 126 "direct" sessions is
Instagram, and there is no way to separate it after the fact. A tagged link
survives the in-app browser; a referrer does not.

## The convention

Three parameters, always, on every link that leaves Instagram:

```
?utm_source=ig&utm_medium=social&utm_campaign=<where>
```

`utm_campaign` is where on Instagram the link sat. Add `utm_content` when you
want to tell two posts apart.

| Where | `utm_campaign` | Add |
|---|---|---|
| Link in bio | `link_in_bio` | nothing |
| A story | `story` | `utm_content=YYYY-MM-DD` |
| A feed post | `post` | `utm_content=YYYY-MM-DD` |
| A reel | `reel` | `utm_content=YYYY-MM-DD` |

Lowercase, underscores, no spaces. GA4 treats `Story` and `story` as two
different campaigns and they will sit on separate rows forever.

## Ready to paste

Link in bio, which is the one that matters most because it never changes:

```
https://edengracejewelry.com/?utm_source=ig&utm_medium=social&utm_campaign=link_in_bio
```

A story or post pointing at one piece, dated so two posts about the same
necklace stay separate:

```
https://edengracejewelry.com/product/the-ellie/?utm_source=ig&utm_medium=social&utm_campaign=story&utm_content=2026-08-24
```

Swap `the-ellie` for any slug in `shared/catalog.js`. The site ignores these
parameters; only GA4 reads them.

## What changes once this is consistent

Direct will shrink and Organic Social will grow. That is the tagging working,
not traffic moving. After a few weeks, Reports > Acquisition > Traffic
acquisition, with Session campaign as the dimension, answers which post sent
the people who actually stayed.
