import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Header } from './Header';
import { ScoreSubmission } from './ScoreSubmission';
import { ScoreStatus } from './ScoreStatus';
import { SchoolCheck } from './SchoolCheck';
import '../styles/PrivateGradeApp.css';

export function PrivateGradeApp() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'submit' | 'status' | 'school'>('submit');

  return (
    <div className="private-grade-app">
      <Header />

      <main className="main-content">
        {!isConnected ? (
          <div className="connect-wallet-container">
            <h2 className="connect-wallet-title">
              Connect Your Wallet
            </h2>
            <p className="connect-wallet-description">
              Please connect your wallet to access the Private Grade System
            </p>
            <ConnectButton />
          </div>
        ) : (
          <div>
            <div className="tab-navigation">
              <nav className="tab-nav">
                <button
                  onClick={() => setActiveTab('submit')}
                  className={`tab-button ${activeTab === 'submit' ? 'active' : 'inactive'}`}
                >
                  Submit Score
                </button>
                <button
                  onClick={() => setActiveTab('status')}
                  className={`tab-button ${activeTab === 'status' ? 'active' : 'inactive'}`}
                >
                  My Score
                </button>
                <button
                  onClick={() => setActiveTab('school')}
                  className={`tab-button ${activeTab === 'school' ? 'active' : 'inactive'}`}
                >
                  School Check
                </button>
              </nav>
            </div>

            {activeTab === 'submit' && <ScoreSubmission />}
            {activeTab === 'status' && <ScoreStatus />}
            {activeTab === 'school' && <SchoolCheck />}
          </div>
        )}
      </main>
    </div>
  );
}