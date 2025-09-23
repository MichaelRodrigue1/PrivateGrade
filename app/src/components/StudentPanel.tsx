import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import '../styles/Status.css';

export function StudentPanel() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { instance } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [ciphertext, setCiphertext] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [score, setScore] = useState<string>('');
  const [grantTo, setGrantTo] = useState<string>('');
  const [grantTx, setGrantTx] = useState<string>('');
  const [grantError, setGrantError] = useState<string>('');
  const [threshold, setThreshold] = useState<string>('60');

  const hasCiphertext = useMemo(() => ciphertext && ciphertext !== '0x' && !/^0x0+$/.test(ciphertext), [ciphertext]);

  const loadCiphertext = async () => {
    if (!address || !publicClient) return;
    setIsLoading(true);
    setCiphertext('');
    try {
      const ct = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getStudentScore',
        args: [address],
        account: address,
      } as any);
      setCiphertext(ct as unknown as string);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setScore('');
    setGrantTx('');
    setGrantError('');
    loadCiphertext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const decrypt = async () => {
    if (!instance || !address || !hasCiphertext) return;
    setIsDecrypting(true);
    try {
      const keypair = instance.generateKeypair();

      const handleContractPairs = [
        { handle: ciphertext, contractAddress: CONTRACT_ADDRESS },
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );

      const signer = await signerPromise;
      if (!signer) throw new Error('Signer not ready');

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x',''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays
      );

      const value = result[ciphertext] ?? '';
      setScore(value?.toString?.() ?? String(value));
    } catch (e) {
      console.error(e);
      setScore('');
    } finally {
      setIsDecrypting(false);
    }
  };

  const grantAccess = async () => {
    setGrantError('');
    setGrantTx('');
    try {
      if (!grantTo || !grantTo.startsWith('0x') || grantTo.length !== 42) {
        setGrantError('Invalid address');
        return;
      }
      const signer = await signerPromise;
      if (!signer) throw new Error('No signer');
      const { Contract } = await import('ethers');
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.grantAccess(grantTo);
      const receipt = await tx.wait();
      setGrantTx(receipt?.hash ?? tx?.hash);
    } catch (e: any) {
      console.error(e);
      setGrantError(e?.shortMessage || e?.message || 'Grant failed');
    }
  };

  const passFail = useMemo(() => {
    const n = Number(score);
    const t = Number(threshold);
    if (!Number.isFinite(n) || !Number.isFinite(t)) return '';
    return n >= t ? 'Pass' : 'Fail';
  }, [score, threshold]);

  return (
    <div className="pg-status-container">
      <div className="status-card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="status-title">My Score</h2>
        <div className="status-grid">
          <div className="status-item">
            <label className="status-label">Ciphertext</label>
            <p className="status-value" style={{ wordBreak: 'break-all' }}>
              {isLoading ? 'Loading...' : hasCiphertext ? ciphertext : 'Not set'}
            </p>
          </div>
          <div className="status-item">
            <label className="status-label">Decrypted</label>
            <p className="status-value">{score || '***'}</p>
          </div>
        </div>

        <div className="decrypt-section" style={{ marginTop: '1rem' }}>
          <button
            onClick={decrypt}
            disabled={!hasCiphertext || isDecrypting}
            className="decrypt-button"
          >
            {isDecrypting ? 'Decrypting...' : 'Decrypt My Score'}
          </button>
        </div>
      </div>

      <div className="status-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="status-title">Grant Access</h3>
        <div className="form-group">
          <label className="form-label">Grant to Address</label>
          <input
            type="text"
            value={grantTo}
            onChange={(e) => setGrantTo(e.target.value.trim())}
            placeholder="0x..."
            className="text-input"
          />
        </div>
        {grantError && (
          <div className="warning-box"><p className="warning-text">{grantError}</p></div>
        )}
        {grantTx && (
          <div className="success-box">
            <p className="success-title">✅ Granted</p>
            <p className="success-text">Tx: <code className="hash-code">{grantTx}</code></p>
          </div>
        )}
        <div className="submit-section">
          <button className="submit-button" onClick={grantAccess}>Grant Access</button>
        </div>
      </div>

      <div className="status-card">
        <h3 className="status-title">Check Against Threshold (local)</h3>
        <div className="form-group">
          <label className="form-label">Threshold</label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="text-input"
          />
        </div>
        <div className="status-item">
          <label className="status-label">Result</label>
          <p className="status-value">{passFail || '-'}</p>
        </div>
      </div>
    </div>
  );
}
