# カリタス / Caritas — Abyss-corrupted reaction sprites

カリタスの心象共鳴バトルで使用する、アビスに侵蝕された九尾の星獣の反応画像置き場。

**保存先**: `assets/battle/caritas/`  
**画像形式**: 透過 WebP (RGBA)  
**規格**: 全8枚 1200×900 px、同一キャンバス／足元の位置合わせ済み  
**利用方法**: 静止画を反応IDごとに切り替える。8コマのループアニメーションにはしない。

## 画像ファイル一覧（アップロード対象）

| ファイル | 用途 |
| --- | --- |
| `caritas-01_closed.webp` | 閉ざす・拒絶 |
| `caritas-02_notice.webp` | 気づき・関心 |
| `caritas-03_guarded.webp` | 身構える・警戒 |
| `caritas-04_hesitate.webp` | 半身を起こす・動揺 |
| `caritas-05_resolve.webp` | 立ち上がる・決意 |
| `caritas-06_resist.webp` | 咆哮・アビスへの抵抗 |
| `caritas-07_accept.webp` | 正面・受容 |
| `caritas-08_relief.webp` | 伏せる・解放後 |

画像の同梱元は `caritas_abyss_8_webp.zip`。この README の登録は画像本体のアップロードを意味しない。

### 運用

- バトルへの組み込みは別作業。既存の戦闘挙動はこの画像準備では変更しない。
- 反応の遷移と共鳴値の制御はバトルロジック側で管理し、画像ファイル名は固定する。
- `main` へのマージはユーザーの明示的な許可まで行わない。
