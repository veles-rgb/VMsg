import { useNavigate } from 'react-router-dom';

export default function Welcome() {
  const navigate = useNavigate();
  return (
    <main>
      <h1>VMsg</h1>
      <p>Welcome to VMsg, please login or register to continue.</p>
      <div>
        <button onClick={() => navigate('/login')}>Login</button>
        <button onClick={() => navigate('/register')}>Register</button>
      </div>
    </main>
  );
}
