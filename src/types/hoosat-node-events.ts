import { UtxoChange, UtxoChanges } from '@models/streaming/streaming.types';

/**
 * События, которые может эмитить HoosatNode
 */
export interface HoosatNodeEvents {
  // UTXO Streaming события
  utxoChanged: [change: UtxoChange];
  utxosChanged: [changes: UtxoChanges];

  // Streaming соединение
  streamingError: [error: Error];
  streamEnded: [];
  streamClosed: [];
  streamReconnected: [];
  streamMaxReconnectAttemptsReached: [];

  // Block события (если добавим в будущем)
  blockAdded: [blockHash: string];
  newBlockTemplate: [];

  // DAA Score события
  virtualDaaScoreChanged: [newScore: string];
  virtualSelectedParentBlueScoreChanged: [newScore: string];

  // Chain события
  virtualSelectedParentChainChanged: [
    data: {
      removedChainBlockHashes: string[];
      addedChainBlockHashes: string[];
      acceptedTransactionIds?: Array<{
        acceptingBlockHash: string;
        acceptedTransactionIds: string[];
      }>;
    },
  ];

  // Общие события
  error: [error: Error];
  connected: [];
  disconnected: [];
}
