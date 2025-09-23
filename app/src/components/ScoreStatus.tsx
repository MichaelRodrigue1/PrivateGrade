import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useReadContract } from 'wagmi';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/ScoreStatus.css';

export function ScoreStatus() {
  const { address } = useAccount();
  const zamaInstance = useZamaInstance();
  const signer = useEthersSigner();

  const [decryptedScore, setDecryptedScore] = useState<number | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [message, setMessage] = useState('');

  // Check if user has a score
  const { data: hasScore, isLoading: hasScoreLoading } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'hasScore',
    args: [address],
  });

  // Get encrypted score handle
  const { data: encryptedScoreHandle, isLoading: scoreLoading } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getStudentScore',
    args: [address],
    query: {
      enabled: !!address && !!hasScore,
    },
  });

  const decryptScore = async () => {
    if (!zamaInstance || !signer || !encryptedScoreHandle || !address) {
      setMessage('Missing requirements for decryption');
      return;
    }

    setIsDecrypting(true);
    setMessage('');

    try {
      // Generate keypair for decryption
      const keypair = zamaInstance.generateKeypair();

      const handleContractPairs = [
        {
          handle: encryptedScoreHandle as string,
          contractAddress: CONTRACT_ADDRESS,
        },
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "10";
      const contractAddresses = [CONTRACT_ADDRESS];

      // Create EIP712 signature
      const eip712 = zamaInstance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      );

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message
      );

      // Decrypt the score
      const result = await zamaInstance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays
      );

      const score = result[encryptedScoreHandle as string];
      setDecryptedScore(Number(score));
      setMessage('Score decrypted successfully!');
    } catch (error: any) {
      console.error('Error decrypting score:', error);
      setMessage(`Error: ${error.message || 'Failed to decrypt score'}`);
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="score-status">
      <div className="status-container">
        <h2 className="status-title">My Score</h2>
        <p className="status-description">
          View your encrypted score. Only you can decrypt your own score.
        </p>

        {hasScoreLoading || scoreLoading ? (
          <div className="loading">Loading...</div>
        ) : !hasScore ? (
          <div className="no-score">
            <p>No score found for your address.</p>
            <p>Ask your teacher to submit a score for you.</p>
          </div>
        ) : (
          <div className="score-section">
            <div className="encrypted-info">
              <h3>Encrypted Score Handle:</h3>
              <p className="handle-text">{encryptedScoreHandle as string}</p>
            </div>

            {decryptedScore !== null ? (
              <div className="decrypted-score">
                <h3>Your Score:</h3>
                <div className="score-display">
                  <span className="score-value">{decryptedScore}</span>
                  <span className="score-total">/100</span>
                </div>
                <div className="score-grade">
                  {decryptedScore >= 90 ? 'A' :
                   decryptedScore >= 80 ? 'B' :
                   decryptedScore >= 70 ? 'C' :
                   decryptedScore >= 60 ? 'D' : 'F'}
                </div>
              </div>
            ) : (
              <button
                onClick={decryptScore}
                disabled={isDecrypting}
                className="decrypt-button"
              >
                {isDecrypting ? 'Decrypting...' : 'Decrypt My Score'}
              </button>
            )}
          </div>
        )}

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}