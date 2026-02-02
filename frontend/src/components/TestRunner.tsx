import { useState, useCallback } from 'react';
import { matchService } from '../services/matchService';
import { syncService } from '../services/syncService';
import { db } from '../db/schema';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
}

export function TestRunner() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState({ passed: 0, failed: 0, total: 0 });

  const log = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
    };
    setLogs(prev => [...prev, entry]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  }, []);

  const updateResult = useCallback((name: string, status: TestResult['status'], message?: string, duration?: number) => {
    setResults(prev => {
      const existing = prev.find(r => r.name === name);
      if (existing) {
        return prev.map(r => r.name === name ? { ...r, status, message, duration } : r);
      }
      return [...prev, { name, status, message, duration }];
    });
  }, []);

  const clearAll = useCallback(() => {
    setResults([]);
    setLogs([]);
    setSummary({ passed: 0, failed: 0, total: 0 });
  }, []);

  // Test: Create Match and Verify Persistence
  const testMatchCreation = async (): Promise<string> => {
    const testName = 'Create Match and Store in IndexedDB';
    updateResult(testName, 'running');
    const startTime = performance.now();

    try {
      log('Creating test match...', 'info');
      const match = await matchService.createMatch({
        matchNumber: `TEST-${Date.now()}`,
        date: '2026-02-01',
        venue: 'Test Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
        tossWinner: 'team-1',
        electedTo: 'bat',
      });

      if (!match || !match.localId) {
        throw new Error('Match creation failed');
      }

      log(`Match created with ID: ${match.localId}`, 'success');

      // Verify it's in IndexedDB
      const retrieved = await db.matches.get({ localId: match.localId });
      if (!retrieved) {
        throw new Error('Match not found in IndexedDB');
      }

      log('Match successfully persisted in IndexedDB', 'success');
      const duration = performance.now() - startTime;
      updateResult(testName, 'passed', `Match ID: ${match.localId}`, duration);
      return match.localId;
    } catch (error) {
      const err = error as Error;
      log(`Error: ${err.message}`, 'error');
      updateResult(testName, 'failed', err.message);
      throw error;
    }
  };

  // Test: Record Delivery
  const testDeliveryRecording = async (matchId: string): Promise<void> => {
    const testName = 'Record Delivery with Runs';
    updateResult(testName, 'running');
    const startTime = performance.now();

    try {
      log('Recording delivery (innings created automatically with match)...', 'info');
      const delivery = await matchService.recordDelivery({
        matchId,
        inningsNumber: 1,
        overNumber: 1,
        ballNumber: 1,
        bowlerId: 'bowler-1',
        bowlerName: 'John Bowler',
        batterId: 'batter-1',
        batterName: 'Jane Batter',
        nonStrikerId: 'batter-2',
        nonStrikerName: 'Bob Batter',
        runsScored: 4,
      });

      if (!delivery || delivery.runsScored !== 4) {
        throw new Error('Delivery recording failed');
      }

      log(`Delivery recorded: ${delivery.runsScored} runs`, 'success');
      const duration = performance.now() - startTime;
      updateResult(testName, 'passed', `Runs: ${delivery.runsScored}`, duration);
    } catch (error) {
      const err = error as Error;
      log(`Error: ${err.message}`, 'error');
      updateResult(testName, 'failed', err.message);
      throw error;
    }
  };

  // Test: Page Refresh Data Retention
  const testDataPersistence = async (matchId: string): Promise<void> => {
    const testName = 'Data Persists After Page Refresh';
    updateResult(testName, 'running');
    const startTime = performance.now();

    try {
      log('Verifying data persistence...', 'info');

      const match = await db.matches.get({ localId: matchId });
      const deliveries = await matchService.getMatchDeliveries(matchId);

      if (!match) {
        throw new Error('Match data lost');
      }

      if (deliveries.length === 0) {
        throw new Error('Delivery data lost');
      }

      log(`Data persisted: ${deliveries.length} deliveries found`, 'success');
      const duration = performance.now() - startTime;
      updateResult(testName, 'passed', `${deliveries.length} deliveries retained`, duration);
    } catch (error) {
      const err = error as Error;
      log(`Error: ${err.message}`, 'error');
      updateResult(testName, 'failed', err.message);
      throw error;
    }
  };

  // Test: Online/Offline Detection
  const testOnlineDetection = async (): Promise<void> => {
    const testName = 'Online/Offline Detection';
    updateResult(testName, 'running');
    const startTime = performance.now();

    try {
      log('Testing online/offline detection...', 'info');

      const initialStatus = syncService.getOnlineStatus();
      log(`Current status: ${initialStatus ? 'ONLINE' : 'OFFLINE'}`, 'info');

      syncService.setOnlineStatus(false);
      const offlineStatus = syncService.getOnlineStatus();
      if (offlineStatus !== false) {
        throw new Error('Failed to set offline status');
      }
      log('Successfully set OFFLINE status', 'success');

      syncService.setOnlineStatus(true);
      const onlineStatus = syncService.getOnlineStatus();
      if (onlineStatus !== true) {
        throw new Error('Failed to set online status');
      }
      log('Successfully set ONLINE status', 'success');

      const duration = performance.now() - startTime;
      updateResult(testName, 'passed', undefined, duration);
    } catch (error) {
      const err = error as Error;
      log(`Error: ${err.message}`, 'error');
      updateResult(testName, 'failed', err.message);
      throw error;
    }
  };

  // Test: Sync Simulation
  const testSyncSimulation = async (): Promise<void> => {
    const testName = 'Sync Simulation (Online Mode)';
    updateResult(testName, 'running');
    const startTime = performance.now();

    try {
      log('Testing sync simulation...', 'info');

      syncService.setOnlineStatus(true);

      const unsyncedBefore = await syncService.getUnsyncedCount();
      log(`Unsynced deliveries before sync: ${unsyncedBefore}`, 'info');

      const result = await syncService.syncAll();

      log(`Sync result: ${result.syncedCount} synced, ${result.failedCount} failed`, 'info');

      const unsyncedAfter = await syncService.getUnsyncedCount();
      log(`Unsynced deliveries after sync: ${unsyncedAfter}`, 'success');

      const duration = performance.now() - startTime;
      if (result.success) {
        updateResult(testName, 'passed', `Synced: ${result.syncedCount}`, duration);
      } else {
        updateResult(testName, 'failed', `Failed: ${result.failedCount}`);
      }
    } catch (error) {
      const err = error as Error;
      log(`Error: ${err.message}`, 'error');
      updateResult(testName, 'failed', err.message);
      throw error;
    }
  };

  // Test: Performance with 500+ Deliveries
  const testPerformance500Deliveries = async (): Promise<void> => {
    const testName = 'Record 500 Deliveries - Performance Test';
    updateResult(testName, 'running');

    try {
      log('Creating match for performance test...', 'info');
      const match = await matchService.createMatch({
        matchNumber: `PERF-${Date.now()}`,
        date: '2026-02-01',
        venue: 'Performance Test Ground',
        team1: { id: 'team-1', name: 'Team A' },
        team2: { id: 'team-2', name: 'Team B' },
        tossWinner: 'team-1',
        electedTo: 'bat',
      });

      // Innings is created automatically with match creation

      log('Recording 500 deliveries...', 'info');
      const startTime = performance.now();

      for (let i = 1; i <= 500; i++) {
        await matchService.recordDelivery({
          matchId: match.localId,
          inningsNumber: 1,
          overNumber: Math.ceil(i / 6),
          ballNumber: ((i - 1) % 6) + 1,
          bowlerId: 'bowler-1',
          bowlerName: 'John Bowler',
          batterId: 'batter-1',
          batterName: 'Jane Batter',
          nonStrikerId: 'batter-2',
          nonStrikerName: 'Bob Batter',
          runsScored: Math.floor(Math.random() * 7),
        });

        if (i % 100 === 0) {
          log(`Recorded ${i} deliveries...`, 'info');
        }
      }

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;

      log(`Recorded 500 deliveries in ${duration.toFixed(2)} seconds`, 'success');
      log(`Average: ${(duration / 500 * 1000).toFixed(2)}ms per delivery`, 'success');

      const deliveries = await matchService.getMatchDeliveries(match.localId);
      log(`Verified: ${deliveries.length} deliveries in database`, 'success');

      updateResult(testName, 'passed', `Duration: ${duration.toFixed(2)}s, Avg: ${(duration / 500 * 1000).toFixed(2)}ms/delivery`, duration * 1000);
    } catch (error) {
      const err = error as Error;
      log(`Error: ${err.message}`, 'error');
      updateResult(testName, 'failed', err.message);
      throw error;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    clearAll();
    log('=== STARTING ALL TESTS ===', 'info');

    let passed = 0;
    let failed = 0;

    try {
      // Offline Tests
      log('--- Offline Persistence Tests ---', 'info');
      const matchId = await testMatchCreation();
      passed++;
      await testDeliveryRecording(matchId);
      passed++;
      await testDataPersistence(matchId);
      passed++;

      // Sync Tests
      log('--- Sync Simulation Tests ---', 'info');
      await testOnlineDetection();
      passed++;
      await testSyncSimulation();
      passed++;

      // Performance Tests
      log('--- Performance Tests ---', 'info');
      await testPerformance500Deliveries();
      passed++;

      log('=== ALL TESTS COMPLETED ===', 'success');
    } catch {
      failed++;
      log('=== SOME TESTS FAILED ===', 'error');
    }

    setSummary({ passed, failed, total: passed + failed });
    setIsRunning(false);
  };

  const clearDatabase = async () => {
    if (window.confirm('Are you sure you want to clear all test data?')) {
      await db.delete();
      log('Database cleared', 'warn');
      window.location.reload();
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Segoe UI, sans-serif' }}>
      <h1 style={{ color: '#2c3e50', borderBottom: '3px solid #3498db', paddingBottom: '10px' }}>
        Cricket Chronicle - Sprint 0 Test Suite
      </h1>
      <p><strong>Test Server:</strong> 192.168.1.235 | <strong>Browser:</strong> {navigator.userAgent.split(' ').slice(-2).join(' ')}</p>

      <div style={{ margin: '20px 0' }}>
        <button
          onClick={runAllTests}
          disabled={isRunning}
          style={{
            background: isRunning ? '#95a5a6' : '#3498db',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            marginRight: '10px',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </button>
        <button
          onClick={clearDatabase}
          disabled={isRunning}
          style={{
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            marginRight: '10px',
          }}
        >
          Clear Database
        </button>
        <button
          onClick={clearAll}
          disabled={isRunning}
          style={{
            background: '#95a5a6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          Clear Log
        </button>
      </div>

      <div style={{
        background: '#34495e',
        color: 'white',
        padding: '15px',
        borderRadius: '4px',
        margin: '20px 0',
        fontSize: '18px',
      }}>
        <strong>Test Results:</strong> Passed: <span style={{ color: '#2ecc71' }}>{summary.passed}</span> |
        Failed: <span style={{ color: '#e74c3c' }}>{summary.failed}</span> |
        Total: {summary.total}
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2>Test Results</h2>
        {results.length === 0 ? (
          <p style={{ color: '#95a5a6' }}>Click "Run All Tests" to start testing...</p>
        ) : (
          results.map((result, index) => (
            <div
              key={index}
              style={{
                padding: '10px',
                margin: '10px 0',
                borderLeft: `4px solid ${
                  result.status === 'passed' ? '#27ae60' :
                  result.status === 'failed' ? '#e74c3c' :
                  result.status === 'running' ? '#f39c12' : '#95a5a6'
                }`,
                background: result.status === 'passed' ? '#eafaf1' :
                  result.status === 'failed' ? '#fadbd8' :
                  result.status === 'running' ? '#fef5e7' : '#ecf0f1',
              }}
            >
              <strong>{result.name}</strong>: {' '}
              <span>
                {result.status === 'passed' ? '✓ PASSED' :
                 result.status === 'failed' ? '✗ FAILED' :
                 result.status === 'running' ? '⟳ RUNNING' : 'Pending'}
              </span>
              {result.message && <span> - {result.message}</span>}
              {result.duration && <span style={{ color: '#7f8c8d' }}> ({result.duration.toFixed(0)}ms)</span>}
            </div>
          ))
        )}
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2>Test Console Log</h2>
        <div style={{
          background: '#2c3e50',
          color: '#ecf0f1',
          padding: '15px',
          borderRadius: '4px',
          fontFamily: 'Courier New, monospace',
          fontSize: '12px',
          maxHeight: '400px',
          overflowY: 'auto',
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#7f8c8d' }}>Test logs will appear here...</div>
          ) : (
            logs.map((entry, index) => (
              <div
                key={index}
                style={{
                  margin: '5px 0',
                  color: entry.type === 'success' ? '#2ecc71' :
                    entry.type === 'error' ? '#e74c3c' :
                    entry.type === 'warn' ? '#f39c12' : '#3498db',
                }}
              >
                [{entry.timestamp}] {entry.message}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#ecf0f1', borderRadius: '4px' }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Click "Run All Tests" to execute all Sprint 0 tests</li>
          <li>Wait for all tests to complete (about 2-3 minutes)</li>
          <li>Review the results - all tests should show ✓ PASSED</li>
          <li>Use "Clear Database" to reset test data if needed</li>
        </ol>
      </div>
    </div>
  );
}
