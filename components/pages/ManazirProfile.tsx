import { MANAZIR_AVATAR } from "components/pages/manazirAvatar";

/** A small, non-interactive profile card; desktop icons and apps remain usable. */
const ManazirProfile: FC = () => (
  <aside
    aria-label="About Manazir"
    style={{
      position: "absolute",
      right: 24,
      top: 28,
      zIndex: 1,
      width: 216,
      padding: 16,
      borderRadius: 16,
      background: "rgba(18, 21, 29, 0.83)",
      border: "1px solid rgba(255,255,255,0.2)",
      boxShadow: "0 12px 30px rgba(0,0,0,0.24)",
      color: "#fff",
      textAlign: "center",
      pointerEvents: "auto",
    }}
  >
    <img
      src={MANAZIR_AVATAR}
      alt="Illustrated avatar selected for Manazir"
      width={96}
      height={96}
      style={{ borderRadius: "50%", objectFit: "cover", margin: "0 auto 10px" }}
    />
    <div style={{ fontWeight: 700, fontSize: 18 }}>Manazir</div>
    <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 6, opacity: 0.85 }}>
      First-year Zoology student
      <br />
      Aligarh Muslim University
    </div>
    <nav aria-label="Manazir social profiles" style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 14 }}>
      <a href="https://www.linkedin.com/in/mohd-manazir-b42471434/" target="_blank" rel="noopener noreferrer" style={{ color: "#b6dcff", fontSize: 13, textDecoration: "underline" }}>LinkedIn</a>
      <a href="https://www.instagram.com/psy.manzar/?hl=en" target="_blank" rel="noopener noreferrer" style={{ color: "#ffc0da", fontSize: 13, textDecoration: "underline" }}>Instagram</a>
    </nav>
  </aside>
);

export default ManazirProfile;
