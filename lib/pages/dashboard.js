
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }
    loadUser();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      {user ? <p>Welcome, {user.email}</p> : <p>Loading user...</p>}
    </div>
  );
}
