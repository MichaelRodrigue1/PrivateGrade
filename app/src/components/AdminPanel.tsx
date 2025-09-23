import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { Contract } from 'ethers';
import '../styles/Submission.css';

export function AdminPanel() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();

  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'owner',
  });

  const isOwner = owner && address && String(owner).toLowerCase() === String(address).toLowerCase();

  const [teacher, setTeacher] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');

  const authorize = async (action: 'add' | 'remove') => {
    setError('');
    setTxHash('');
    try {
      if (!teacher || !teacher.startsWith('0x') || teacher.length !== 42) {
        setError('Invalid address');
        return;
      }
      const signer = await signerPromise;
      if (!signer) throw new Error('No signer');
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = action === 'add'
        ? await contract.authorizeTeacher(teacher)
        : await contract.deauthorizeTeacher(teacher);
      const receipt = await tx.wait();
      setTxHash(receipt?.hash ?? tx?.hash);
    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage || e?.message || 'Tx failed');
    }
  };

  const { data: teacherAuthorized } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'authorizedTeachers',
    args: teacher ? [teacher as `0x${string}`] : undefined,
    query: { enabled: !!teacher },
  });

  return (
    <div className="pg-submission-container">
      <div className="pg-submission-card">
        <h2 className="pg-submission-title">Admin</h2>
        <div className="status-item">
          <label className="status-label">Owner</label>
          <p className="status-value">{String(owner || '')}</p>
        </div>
        {!isOwner ? (
          <p>You are not the owner.</p>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Teacher Address</label>
              <input
                type="text"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value.trim())}
                placeholder="0x..."
                className="text-input"
              />
            </div>
            {teacher && (
              <div className="status-item">
                <label className="status-label">Authorized</label>
                <p className="status-value">{teacherAuthorized ? 'Yes' : 'No'}</p>
              </div>
            )}

            {error && (
              <div className="warning-box"><p className="warning-text">{error}</p></div>
            )}
            {txHash && (
              <div className="success-box">
                <p className="success-title">✅ OK</p>
                <p className="success-text">Tx: <code className="hash-code">{txHash}</code></p>
              </div>
            )}

            <div className="submit-section" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="submit-button" onClick={() => authorize('add')}>Authorize</button>
              <button className="submit-button" onClick={() => authorize('remove')}>Deauthorize</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
