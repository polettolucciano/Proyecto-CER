import ReactDOM from 'react-dom/client';
import { AppErrorBoundary } from './features/shell/AppErrorBoundary';
import { Application } from './Application';
import './styles/tokens.css';
import './styles.css';
import './premium.css';
import './readability.css';
import './styles/workflows.css';
import './styles/auth.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<AppErrorBoundary><Application /></AppErrorBoundary>);
