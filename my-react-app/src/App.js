import './App.css';
import Header from './Components/Header';
import Footer from './Components/Footer';
import DebtList from './Pages/DebtList';

function App() {
  return (
    <div className="App">
      <Header />

      <main>
        <DebtList />
      </main>

      <Footer />
    </div>
  );
}

export default App;
