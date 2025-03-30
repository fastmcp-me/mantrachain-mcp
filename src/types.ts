/**
 * Response interface for blockchain transactions
 */
export interface TransactionResponse {
  /** Transaction hash from the blockchain */
  transactionHash: string;
  
  /** Explorer URL for viewing the transaction */
  explorerUrl: string;
  
  /** Whether the transaction was successful */
  success: boolean;
  
  /** Amount of gas used in the transaction */
  gasUsed: string;
  
  /** Amount of gas wanted for the transaction */
  gasWanted: string;
  
  /** Optional additional fields */
  [key: string]: any;
}
