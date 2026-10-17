import ReactDOM from 'react-dom/client';
import { AppProvider } from './store';
import App from './App';
import './styles.css';
import './readability.css';
import './premium.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<AppProvider><App /></AppProvider>);
