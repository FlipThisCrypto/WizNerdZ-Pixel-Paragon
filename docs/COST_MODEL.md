# Cost & bandwidth model (GitHub Pages)

## Assumptions

- 8,888 PNGs ≈ 7–12 KB each (640×640 pixel art) → order of **~80–100 MB** art  
- Metadata JSON ≈ 1–3 KB each → **~15–25 MB**  
- Landing shell < 200 KB  

## Traffic scenarios

| Scenario | Est. transfer |
|----------|----------------|
| 1k unique gallery peeks (12 thumbs) | ~100 MB |
| Full metadata crawl by indexer | ~20 MB |
| Viral day 50k landing views | ~5–10 GB (mostly art if uncached) |

## Controls

- Lazy-load galleries  
- Absolute URLs enable CDN caching by consumer tools  
- Integrity scripts prevent silent corrupt redeploys  
- Prefer IPFS later if bandwidth cost becomes material  

## Decision

Stay on Pages until sustained bandwidth or permanence requirements justify IPFS pin + dual-host.
