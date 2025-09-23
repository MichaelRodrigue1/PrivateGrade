import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { Contract } from 'ethers';
import '../styles/ScoreSubmission.css';

export function ScoreSubmission() {
  const { address } = useAccount();
  const signer = useEthersSigner();
  const zamaInstance = useZamaInstance();

  const [studentAddress, setStudentAddress] = useState('');
  const [score, setScore] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signer || !zamaInstance || !address) {
      setMessage('Please connect your wallet first');
      return;
    }

    if (!studentAddress || !score) {
      setMessage('Please fill in all fields');
      return;
    }

    const scoreNum = parseInt(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setMessage('Score must be between 0 and 100');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      // Create contract instance
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Check if user is authorized teacher
      const isAuthorized = await contract.authorizedTeachers(address);
      if (!isAuthorized) {
        setMessage('You are not authorized as a teacher');
        setIsSubmitting(false);
        return;
      }

      // Create encrypted input
      const input = zamaInstance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.add32(scoreNum);
      const encryptedInput = await input.encrypt();

      // Submit score
      const tx = await contract.submitScore(
        studentAddress,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );

      setMessage('Transaction submitted. Waiting for confirmation...');
      await tx.wait();

      setMessage('Score submitted successfully!');
      setStudentAddress('');
      setScore('');
    } catch (error: any) {
      console.error('Error submitting score:', error);
      setMessage(`Error: ${error.reason || error.message || 'Failed to submit score'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="score-submission">
      <div className="form-container">
        <h2 className="form-title">Submit Student Score</h2>
        <p className="form-description">
          Submit encrypted scores for students. Only authorized teachers can submit scores.
        </p>

        <form onSubmit={handleSubmit} className="submission-form">
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
              disabled={isSubmitting}
            />
          </div>

          <div className="input-group">
            <label htmlFor="score" className="input-label">
              Score (0-100)
            </label>
            <input
              type="number"
              id="score"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="85"
              min="0"
              max="100"
              className="text-input"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Score'}
          </button>
        </form>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}