import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { Contract } from 'ethers';
import '../styles/Submission.css';

export function TeacherPanel() {
  const { address } = useAccount();
  const { instance, isLoading: zamaLoading } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [student, setStudent] = useState<string>('');
  const [score, setScore] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');

  const validScore = useMemo(() => {
    const n = Number(score);
    return Number.isFinite(n) && n >= 0 && n <= 100;
  }, [score]);

  const { data: isAuthorized } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'authorizedTeachers',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    setError('');
    setTxHash('');
  }, [student, score]);

  const submit = async () => {
    setError('');
    setTxHash('');
    if (!address || !instance) {
      setError('Wallet or encryption not ready');
      return;
    }
    if (!student || !student.startsWith('0x') || student.length !== 42) {
      setError('Invalid student address');
      return;
    }
    if (!validScore) {
      setError('Score must be 0-100');
      return;
    }

    try {
      setIsSubmitting(true);

      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.add32(Number(score));
      const encryptedInput = await input.encrypt();

      const signer = await signerPromise;
      if (!signer) throw new Error('No signer');

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.submitScore(
        student,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      const receipt = await tx.wait();
      setTxHash(receipt?.hash ?? tx.hash);
    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage || e?.message || 'Submit failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="pg-submission-container">
        <div className="pg-submission-card">
          <h2 className="pg-submission-title">Teacher</h2>
          <p>You are not an authorized teacher.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pg-submission-container">
      <div className="pg-submission-card">
        <h2 className="pg-submission-title">Submit Student Score</h2>

        <div className="form-group">
          <label className="form-label">Student Address</label>
          <input
            type="text"
            value={student}
            onChange={(e) => setStudent(e.target.value.trim())}
            placeholder="0x..."
            className="text-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Score (0 - 100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="text-input"
          />
        </div>

        {error && (
          <div className="warning-box"><p className="warning-text">{error}</p></div>
        )}
        {txHash && (
          <div className="success-box">
            <p className="success-title">✅ Submitted</p>
            <p className="success-text">Tx: <code className="hash-code">{txHash}</code></p>
          </div>
        )}

        <div className="submit-section">
          <button
            onClick={submit}
            disabled={zamaLoading || isSubmitting}
            className="submit-button"
          >
            {zamaLoading ? 'Initializing Zama...' : isSubmitting ? 'Submitting...' : 'Submit Score'}
          </button>
        </div>
      </div>
    </div>
  );
}
