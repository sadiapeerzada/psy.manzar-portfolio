import { type ComponentProcessProps } from "components/system/Apps/RenderComponent";

const INSTAGRAM_URL = "https://www.instagram.com/psy.manzar/?hl=en";

/**
 * Instagram blocks third-party embedding. Link out instead of displaying
 * a broken iframe or suggesting this is an authenticated Instagram client.
 */
const Instagram: FC<ComponentProcessProps> = () => (
  <main
    style={{
      alignItems: "center",
      background: "linear-gradient(145deg, #24152e, #11121b 70%)",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      height: "100%",
      justifyContent: "center",
      padding: 28,
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 54 }} aria-hidden="true">📸</div>
    <h1 style={{ fontSize: 27, margin: 0 }}>Instagram</h1>
    <p style={{ fontSize: 19, margin: 0, fontWeight: 600 }}>@psy.manzar</p>
    <p style={{ color: "#d3c8d9", margin: 0 }}>
      Visit Mohammad Manazir's Instagram profile.
    </p>
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        background: "linear-gradient(100deg, #b92cb7, #ef476f, #f6a23c)",
        borderRadius: 12,
        color: "#fff",
        fontWeight: 700,
        padding: "12px 20px",
        textDecoration: "none",
      }}
    >
      Open @psy.manzar on Instagram ↗
    </a>
    <small style={{ color: "#b9adbf" }}>
      Opens Instagram in a new browser tab.
    </small>
  </main>
);

export default Instagram;
