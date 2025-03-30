import { Component } from 'solid-js';
import './LoadingOverlay.css';

interface LoadingOverlayProps {
  message: string;
}

const LoadingOverlay: Component<LoadingOverlayProps> = (props) => {
  return (
    <div class="loading-overlay">
      <div class="loading-overlay-content">
        <div class="loading-spinner">
          <div class="spinner-inner"></div>
        </div>
        <div class="loading-message">{props.message}</div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
