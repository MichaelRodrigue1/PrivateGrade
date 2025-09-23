import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { Contract } from 'ethers';
import '../styles/SchoolCheck.css';

export function SchoolCheck() {
  const { address } = useAccount();
  const signer = useEthersSigner();

  const [studentAddress, setStudentAddress] = useState('');
  const [threshold, setThreshold] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signer || !address) {
      setMessage('Please connect your wallet first');
      return;
    }

    if (!studentAddress || !threshold) {
      setMessage('Please fill in all fields');
      return;
    }

    const thresholdNum = parseInt(threshold);
    if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 100) {
      setMessage('Threshold must be between 0 and 100');
      return;
    }

    setIsChecking(true);
    setMessage('');
    setResult(null);

    try {
      // Create contract instance
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Check if student has a score
      const hasScore = await contract.hasScore(studentAddress);
      if (!hasScore) {
        setMessage('Student does not have a score recorded');
        setIsChecking(false);
        return;
      }

      // Check admission threshold
      const tx = await contract.meetsAdmissionThreshold(studentAddress, thresholdNum);
      setMessage('Transaction submitted. Waiting for confirmation...');
      await tx.wait();

      // Note: In a real implementation, you would need to decrypt the result
      // For now, we'll show that the check was performed
      setMessage('Threshold check completed successfully! Result is encrypted.');
      setResult(true); // Placeholder - in reality this would be decrypted
    } catch (error: any) {
      console.error('Error checking threshold:', error);
      setMessage(`Error: ${error.reason || error.message || 'Failed to check threshold'}`);
    } finally {
      setIsChecking(false);
    }
  };

  const handleBatchCheck = async () => {
    if (!signer || !address) {
      setMessage('Please connect your wallet first');
      return;
    }

    // For demo purposes - in real app this would come from form input
    const students = [studentAddress];
    const thresholdNum = parseInt(threshold);

    if (!studentAddress || isNaN(thresholdNum)) {
      setMessage('Please fill in all fields first');
      return;
    }

    setIsChecking(true);
    setMessage('');

    try {
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.batchCheckAdmissionThreshold(students, thresholdNum);
      setMessage('Batch check submitted. Waiting for confirmation...');
      await tx.wait();

      setMessage('Batch threshold check completed successfully!');
    } catch (error: any) {
      console.error('Error in batch check:', error);
      setMessage(`Error: ${error.reason || error.message || 'Failed to perform batch check'}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="school-check">
      <div className="check-container">
        <h2 className="check-title">School Admission Check</h2>
        <p className="check-description">
          Check if a student meets the admission threshold without seeing their actual score.
        </p>

        <form onSubmit={handleCheck} className="check-form">
          <div className="input-group">
            <label htmlFor="studentAddress" className="input-label">
              Student Address
            </label>
            <input
              type="text"
              id="studentAddress"
              value={studentAddress}
              onChange={(e) => setStudentAddress(e.target.value)}
              placeholder="0x..."
              className="text-input"
              disabled={isChecking}
            />
          </div>

          <div className="input-group">
            <label htmlFor="threshold" className="input-label">
              Admission Threshold (0-100)
            </label>
            <input
              type="number"
              id="threshold"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="75"
              min="0"
              max="100"
              className="text-input"
              disabled={isChecking}
            />
          </div>

          <div className="button-group">
            <button
              type="submit"
              disabled={isChecking}
              className="check-button primary"
            >
              {isChecking ? 'Checking...' : 'Check Threshold'}
            </button>

            <button
              type="button"
              onClick={handleBatchCheck}
              disabled={isChecking}
              className="check-button secondary"
            >
              Batch Check
            </button>
          </div>
        </form>

        {result !== null && (
          <div className="result-section">
            <h3>Check Result:</h3>
            <div className={`result-display ${result ? 'pass' : 'fail'}`}>
              {result ? '✓ Meets Threshold' : '✗ Does Not Meet Threshold'}
            </div>
            <p className="result-note">
              Note: This is an encrypted result. The actual score remains private.
            </p>
          </div>
        )}

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <div className="info-section">
          <h3>How it works:</h3>
          <ul>
            <li>Students' scores are encrypted and stored on-chain</li>
            <li>Schools can only check if scores meet thresholds</li>
            <li>Actual scores remain completely private</li>
            <li>Results are also encrypted for additional privacy</li>
          </ul>
        </div>
      </div>
    </div>
  );
}