export default function Logo() {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      marginBottom: "10px"
    }}>
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png"
        alt="Tesla Logo"
        style={{ 
          width: 140, 
          height: "auto",
          filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.5))"
        }}
      />
    </div>
  );
}