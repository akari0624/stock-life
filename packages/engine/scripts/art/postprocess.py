"""art-out/ 的 PNG → apps/web/public/art/ 的 webp。

  背景：直接壓 webp（舞台是 background-size: cover，不需要 alpha）
  角色：先去背（rembg）再壓 webp，因為舞台用 object-fit: contain，
        沒去背的話玩家看到的是一塊灰色方卡

用的是獨立的 venv（~/ai/art-tools），不動 ComfyUI 那個——rembg 會拉
onnxruntime 與 numpy，混在一起有機會把 ComfyUI 弄壞。

由 `pnpm --filter engine run art:install` 呼叫，不必自己跑。
"""

import sys
from pathlib import Path

from PIL import Image

QUALITY = 82


def load_remover():
    """去背器只在真的要處理角色時才載入——第一次會下載 u2net 模型。"""
    from rembg import new_session, remove

    session = new_session("u2net")
    return lambda image: remove(image, session=session)


def convert(src: Path, dst: Path, cut_out, max_width: int) -> tuple[int, int]:
    image = Image.open(src)
    if cut_out is not None:
        image = cut_out(image.convert("RGBA"))
        image = image.crop(image.getbbox() or image.getbbox())
    else:
        image = image.convert("RGB")

    if image.width > max_width:
        height = round(image.height * max_width / image.width)
        image = image.resize((max_width, height), Image.LANCZOS)

    dst.parent.mkdir(parents=True, exist_ok=True)
    image.save(dst, "WEBP", quality=QUALITY, method=6)
    return src.stat().st_size, dst.stat().st_size


def main() -> int:
    src_dir, out_dir, actor_list = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
    actors = set(filter(None, actor_list.split(",")))

    files = sorted(src_dir.glob("*.png"))
    if not files:
        print(f"{src_dir} 裡沒有 PNG，先跑 art:gen", file=sys.stderr)
        return 1

    cut_out = load_remover() if any(f.stem in actors for f in files) else None
    before = after = 0

    for file in files:
        is_actor = file.stem in actors
        kind = "actors" if is_actor else "bg"
        # 角色只出現在舞台寬度 22% 的位置，背景是滿版，兩者需要的解析度差很多
        src_bytes, dst_bytes = convert(
            file, out_dir / kind / f"{file.stem}.webp", cut_out if is_actor else None, 640 if is_actor else 1344
        )
        before += src_bytes
        after += dst_bytes
        print(f"  {kind}/{file.stem}.webp  {src_bytes / 1024:.0f} KB → {dst_bytes / 1024:.0f} KB")

    print(f"\n{len(files)} 張：{before / 2**20:.1f} MB → {after / 2**20:.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
