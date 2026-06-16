import { useApp } from '../context/AppContext.jsx';

export default function Toast() {
  const { toast } = useApp();
  if (!toast.show) return null;
  return (
    <div className={`toast-bar${toast.err ? ' error' : ''}`}>
      <i className="fa-solid fa-circle-check"></i>
      {toast.msg}
    </div>
  );
}