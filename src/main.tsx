import ReactDOM from 'react-dom/client';
import { AppErrorBoundary } from './features/shell/AppErrorBoundary';
import { AppProvider } from './store';
import App from './App';
import './styles/tokens.css';
import './styles.css';
import './premium.css';
import './readability.css';
import './styles/workflows.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<AppErrorBoundary><AppProvider><App /></AppProvider></AppErrorBoundary>);
