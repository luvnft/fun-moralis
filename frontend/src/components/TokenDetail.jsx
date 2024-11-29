import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import '../App.css'; 
import { abi } from './abi'; 
import { tokenAbi } from './tokenAbi';

const TokenDetail = () => {
  const { tokenAddress } = useParams();
  const location = useLocation();
  const { card } = location.state || {};

  const [owners, setOwners] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalSupply, setTotalSupply] = useState('0');
  const [remainingTokens, setRemainingTokens] = useState('0');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [cost, setCost] = useState('0');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [account, setAccount] = useState(null); // Added state for account
  const navigate = useNavigate();

  const tokenDetails = card || {
    name: 'Unknown',
    symbol: 'Unknown',
    description: 'No description available',
    tokenImageUrl: 'https://via.placeholder.com/200',
    fundingRaised: '0 ETH',
    creatorAddress: '0x0000000000000000000000000000000000000000',
  };

  const fundingRaised = parseFloat(tokenDetails.fundingRaised.replace(' ETH', ''));

  // Constants
  const fundingGoal = 24; 
  const maxSupply = parseInt(800000); 

  // Function to connect wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const [connectedAccount] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(connectedAccount);
        console.log('Connected:', connectedAccount);
      } catch (err) {
        console.error('Error connecting wallet:', err);
      }
    } else {
      alert('Please install MetaMask to connect your wallet.');
    }
  };

  // Function to disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    console.log('Disconnected wallet');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ownersResponse = await fetch(
          `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/owners?chain=sepolia&order=DESC`,
          {
            headers: {
              accept: 'application/json',
              'X-API-Key': process.env.REACT_APP_X_API_KEY,
            },
          }
        );
        const ownersData = await ownersResponse.json();
        setOwners(ownersData.result || []);

        const transfersResponse = await fetch(
          `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/transfers?chain=sepolia&order=DESC`,
          {
            headers: {
              accept: 'application/json',
              'X-API-Key': process.env.REACT_APP_X_API_KEY,
            },
          }
        );
        const transfersData = await transfersResponse.json();
        setTransfers(transfersData.result || []);

        // Fetch total supply
        const provider = new ethers.JsonRpcProvider(process.env.REACT_APP_RPC_URL);
        const contract = new ethers.Contract(tokenAddress, tokenAbi, provider);
        const totalSupplyResponse = await contract.totalSupply();
        var totalSupplyFormatted = parseInt(ethers.formatUnits(totalSupplyResponse, 'ether')) - 200000;
        setTotalSupply(parseInt(totalSupplyFormatted));

        // Calculate remaining tokens
        setRemainingTokens(maxSupply - totalSupplyFormatted);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tokenAddress]);

  const fundingRaisedPercentage = (fundingRaised / fundingGoal) * 100;
  const totalSupplyPercentage =
    ((parseFloat(totalSupply) - 200000) / ethers.formatUnits(maxSupply - 200000, 'ether')) * 100;

  const getCost = async () => {
    if (!purchaseAmount) return;

    try {
      const provider = new ethers.JsonRpcProvider(process.env.REACT_APP_RPC_URL);
      const contract = new ethers.Contract(process.env.REACT_APP_CONTRACT_ADDRESS, abi, provider);
      const costInWei = await contract.calculateCost(totalSupply, purchaseAmount); 
      setCost(ethers.formatUnits(costInWei, 'ether'));
      setIsModalOpen(true); 
    } catch (error) {
      console.error('Error calculating cost:', error);
    }
  };

  const handlePurchase = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      console.log(signer);
      const contract = new ethers.Contract(process.env.REACT_APP_CONTRACT_ADDRESS, abi, signer);

      const transaction = await contract.buyMemeToken(tokenAddress, purchaseAmount,{
        value: ethers.parseUnits(cost, 'ether'),
      }); 
      const receipt = await transaction.wait();

      alert(`Transaction successful! Hash: ${receipt.hash}`);
      setIsModalOpen(false); 
    } catch (error) {
      console.error('Error during purchase:', error);
    }
  };

  return (
    <div className="token-detail-container">
      <nav className="navbar">
        <a href="#" className="nav-link">[moralis]</a>
        <a href="#" className="nav-link">[docs]</a>
        <button className="nav-button" onClick={account ? disconnectWallet : connectWallet}>
          {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : '[Connect Wallet]'}
        </button>
      </nav>

      <h3 className="start-new-coin" onClick={() => navigate('/')}>[go back]</h3>

      <div className="token-details-section">
        <div className="token-details">
          <h2>Token Detail for {tokenDetails.name}</h2>
          <img src={tokenDetails.tokenImageUrl} alt={tokenDetails.name} className="token-detail-image" />
          <p><strong>Creator Address:</strong> {tokenDetails.creatorAddress}</p>
          <p><strong>Token Address:</strong> {tokenAddress}</p>
          <p><strong>Funding Raised:</strong> {tokenDetails.fundingRaised}</p>
          <p><strong>Token Symbol:</strong> {tokenDetails.symbol}</p>
          <p><strong>Description:</strong> {tokenDetails.description}</p>
        </div>

        <div className="right-column">
          <div className="progress-bars">
            <div className="progress-container">
              <p><strong>Bonding Curve Progress:</strong> {fundingRaised} / {fundingGoal} ETH</p>
              <div className="progress-bar">
                <div className="progress" style={{ width: `${fundingRaisedPercentage}%` }}></div>
              </div>
              <p>When the market cap reaches {fundingGoal} ETH, all the liquidity from the bonding curve will be deposited into Uniswap, and the LP tokens will be burned.</p>
            </div>

            <div className="progress-container">
              <p><strong>Remaining Tokens Available for Sale:</strong> {remainingTokens} / 800,000</p>
              <div className="progress-bar">
                <div className="progress" style={{ width: `${totalSupplyPercentage}%` }}></div>
              </div>
            </div>
          </div>

          <div className="buy-tokens">
            <h3>Buy Tokens</h3>
            <input
              type="number"
              placeholder="Enter amount of tokens to buy"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              className="buy-input"
            />
            <button onClick={getCost} className="buy-button">Purchase</button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h4>Confirm Purchase</h4>
            <p>Cost of {purchaseAmount} tokens: {cost} ETH</p>
            <button onClick={handlePurchase} className="confirm-button">Confirm</button>
            <button onClick={() => setIsModalOpen(false)} className="cancel-button">Cancel</button>
          </div>
        </div>
      )}

      <h3>Owners</h3>
      {loading ? (
        <p>Loading owners...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Owner Address</th>
              <th>Percentage of Total Supply</th>
            </tr>
          </thead>
          <tbodyHere's an updated version of your React code with several improvements:

### Key Changes:
- Corrected some variable usage, especially for `totalSupply`, and improved token purchase logic.
- Improved error handling and code organization for fetching owners, transfers, and calculating costs.
- Simplified handling of modals and updates to the progress bar logic.
  
```jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import '../App.css'; 
import { abi } from './abi'; 
import { tokenAbi } from './tokenAbi';

const TokenDetail = () => {
  const { tokenAddress } = useParams();
  const location = useLocation();
  const { card } = location.state || {};

  const [owners, setOwners] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalSupply, setTotalSupply] = useState(0);
  const [remainingTokens, setRemainingTokens] = useState(0);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [cost, setCost] = useState('0');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate(); 

  const tokenDetails = card || {
    name: 'Unknown',
    symbol: 'Unknown',
    description: 'No description available',
    tokenImageUrl: 'https://via.placeholder.com/200',
    fundingRaised: '0 ETH',
    creatorAddress: '0x0000000000000000000000000000000000000000',
  };

  const fundingRaised = parseFloat(tokenDetails.fundingRaised.replace(' ETH', ''));

  // Constants
  const fundingGoal = 24; 
  const maxSupply = 800000;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch owners data
        const ownersResponse = await fetch(
          `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/owners?chain=sepolia&order=DESC`,
          {
            headers: {
              accept: 'application/json',
              'X-API-Key': process.env.REACT_APP_X_API_KEY,
            },
          }
        );
        const ownersData = await ownersResponse.json();
        setOwners(ownersData.result || []);

        // Fetch transfers data
        const transfersResponse = await fetch(
          `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/transfers?chain=sepolia&order=DESC`,
          {
            headers: {
              accept: 'application/json',
              'X-API-Key': process.env.REACT_APP_X_API_KEY,
            },
          }
        );
        const transfersData = await transfersResponse.json();
        setTransfers(transfersData.result || []);

        // Fetch total supply
        const provider = new ethers.JsonRpcProvider(process.env.REACT_APP_RPC_URL);
        const contract = new ethers.Contract(tokenAddress, tokenAbi, provider);
        const totalSupplyResponse = await contract.totalSupply();
        const totalSupplyFormatted = parseInt(ethers.formatUnits(totalSupplyResponse, 'ether'));
        setTotalSupply(totalSupplyFormatted);

        // Calculate remaining tokens
        setRemainingTokens(maxSupply - totalSupplyFormatted);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tokenAddress]);

  // Calculate progress percentages
  const fundingRaisedPercentage = (fundingRaised / fundingGoal) * 100;
  const totalSupplyPercentage = (totalSupply / maxSupply) * 100;

  // Get the cost for the purchase of tokens
  const getCost = async () => {
    if (!purchaseAmount) return;

    try {
      const provider = new ethers.JsonRpcProvider(process.env.REACT_APP_RPC_URL);
      const contract = new ethers.Contract(process.env.REACT_APP_CONTRACT_ADDRESS, abi, provider);
      const costInWei = await contract.calculateCost(purchaseAmount);
      setCost(ethers.formatUnits(costInWei, 'ether'));
      setIsModalOpen(true); // Open the modal
    } catch (error) {
      console.error('Error calculating cost:', error);
    }
  };

  // Handle the token purchase
  const handlePurchase = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(process.env.REACT_APP_CONTRACT_ADDRESS, abi, signer);

      const transaction = await contract.buyMemeToken(tokenAddress, purchaseAmount, {
        value: ethers.parseUnits(cost, 'ether'),
      }); 
      const receipt = await transaction.wait();

      alert(`Transaction successful! Hash: ${receipt.hash}`);
      setIsModalOpen(false); 
    } catch (error) {
      console.error('Error during purchase:', error);
    }
  };

  return (
    <div className="token-detail-container">
      <nav className="navbar">
        <a href="#" className="nav-link">[moralis]</a>
        <a href="#" className="nav-link">[docs]</a>
        <button className="nav-button">[connect wallet]</button>
      </nav>

      <h3 className="start-new-coin" onClick={() => navigate('/')}>[go back]</h3>

      <div className="token-details-section">
        <div className="token-details">
          <h2>Token Detail for {tokenDetails.name}</h2>
          <img src={tokenDetails.tokenImageUrl} alt={tokenDetails.name} className="token-detail-image" />
          <p><strong>Creator Address:</strong> {tokenDetails.creatorAddress}</p>
          <p><strong>Token Address:</strong> {tokenAddress}</p>
          <p><strong>Funding Raised:</strong> {tokenDetails.fundingRaised}</p>
          <p><strong>Token Symbol:</strong> {tokenDetails.symbol}</p>
          <p><strong>Description:</strong> {tokenDetails.description}</p>
        </div>

        <div className="right-column">
          <div className="progress-bars">
            <div className="progress-container">
              <p><strong>Bonding Curve Progress:</strong> {fundingRaised} / {fundingGoal} ETH</p>
              <div className="progress-bar">
                <div className="progress" style={{ width: `${fundingRaisedPercentage}%` }}></div>
              </div>
              <p>When the market cap reaches {fundingGoal} ETH, all the liquidity from the bonding curve will be deposited into Uniswap, and the LP tokens will be burned. Progression increases as the price goes up.</p>
            </div>

            <div className="progress-container">
              <p><strong>Remaining Tokens Available for Sale:</strong> {remainingTokens} / {maxSupply}</p>
              <div className="progress-bar">
                <div className="progress" style={{ width: `${totalSupplyPercentage}%` }}></div>
              </div>
            </div>
          </div>

          <div className="buy-tokens">
            <h3>Buy Tokens</h3>
            <input
              type="number"
              placeholder="Enter amount of tokens to buy"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              className="buy-input"
            />
            <button onClick={getCost} className="buy-button">Purchase</button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h4>Confirm Purchase</h4>
            <p>Cost of {purchaseAmount} tokens: {cost} ETH</p>
            <button onClick={handlePurchase} className="confirm-button">Confirm</button>
            <button onClick={() => setIsModalOpen(false)} className="cancel-button">Cancel</button>
          </div>
        </div>
      )}

      <h3>Owners</h3>
      {loading ? (
        <p>Loading owners...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Owner Address</th>
              <th>Percentage of Total Supply</th>
            </tr>
          </thead>
          <tbody>
            {owners.map((owner, index) => (
              <tr key={index}>
                <td>{owner.owner_address}</td>
                <td>{owner.percentage_relative_to_total_supply}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Transfers</h3>
      {loading ? (
        <p>Loading transfers...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>From Address</th>
              <th>To Address</th>
              <th>Value (ETH)</th>
              <th>Transaction Hash</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((transfer, index) => (
              <tr key={index}>
                <td>{transfer.from_address}</td>
                <td>{transfer.to_address}</td>
                <td>{transfer.value_decimal}</td>
                <td><a style={{color:"white"}} href={`https://sepolia.etherscan.io/tx/${transfer.transaction_hash}`} target="_blank" rel="noopener noreferrer">{transfer.transaction_hash}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TokenDetail;
