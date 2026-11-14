import { Component, type ReactNode } from "react";

type Props = { fallback: ReactNode; children: ReactNode };
type State = { hasError: boolean };

/** Evita que un fallo de WebGL tumbe toda la aplicación. */
export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {
    /* silencioso: el respaldo 2D toma el control */
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
