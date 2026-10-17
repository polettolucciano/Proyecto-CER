import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Icon } from '../../components';

interface Props { children: ReactNode; }
interface State { failed: boolean; }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CER encontró un error no recuperable en la interfaz.', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="fatal-error" role="alert">
      <div className="fatal-error-card">
        <img src="/cer-logo.png" width={74} height={63} alt="CER" />
        <span className="fatal-error-icon"><Icon name="TriangleAlert" size={23} /></span>
        <p className="eyebrow">RECUPERACIÓN SEGURA</p>
        <h1>No pudimos mostrar esta pantalla</h1>
        <p>Los datos guardados en este navegador no fueron eliminados. Recargá la aplicación para volver a intentarlo.</p>
        <button className="button primary" type="button" onClick={() => window.location.reload()}><Icon name="RefreshCw" size={17} />Recargar aplicación</button>
        <small>Si el problema continúa, registrá qué estabas haciendo y comunicáselo al responsable del sistema.</small>
      </div>
    </main>;
  }
}
