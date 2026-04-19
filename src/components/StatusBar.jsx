export default function StatusBar({ theme = 'light' }) {
  return (
    <div className={`status-bar ${theme}`}>
      <span className="status-time">9:41</span>
      <div className="status-icons">
        <div className="status-dot" />
        <div className="status-dot" />
        <div className="status-dot" />
        <div className="status-battery">
          <div className="status-battery-fill" />
        </div>
      </div>
    </div>
  );
}
