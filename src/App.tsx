import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Lobby from './components/Lobby';
import GameScreen from './components/GameScreen';
import VirtualController from './components/VirtualController';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/host" element={<GameScreen />} />
          <Route path="/join" element={<VirtualController />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
