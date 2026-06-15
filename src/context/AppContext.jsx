import { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [toast, setToast] = useState({ show: false, msg: '', err: false });
  const [modal, setModal] = useState(null);
  const [checkoutPlan, setCheckoutPlan] = useState({ name: 'FIP Standard Membership', amount: 500 });

  const showToast = useCallback((msg, err = false) => {
    setToast({ show: true, msg, err });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3400);
  }, []);

  const openModal = useCallback((id) => setModal(id), []);
  const closeModal = useCallback(() => setModal(null), []);
  const startCheckout = useCallback((name, amount) => setCheckoutPlan({ name, amount }), []);

  return (
    <AppContext.Provider value={{ toast, showToast, modal, openModal, closeModal, checkoutPlan, startCheckout }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);