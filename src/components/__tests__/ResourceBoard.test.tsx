import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResourceBoard } from '../ResourceBoard';
import { ViewState } from '../../types';
import React from 'react';

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isLoaded: true,
    getToken: vi.fn().mockResolvedValue('test-token'),
  }),
}));


const mockResources = [
  {
    id: '1',
    type: 'link',
    title: 'Resource Alpha',
    url: 'https://alpha.com',
    tags: ['deep-learning'],
    notes: 'Note alpha',
    dateAdded: Date.now(),
    completed: false,
    folderId: 'general'
  },
  {
    id: '2',
    type: 'link',
    title: 'Resource Beta',
    url: 'https://beta.com',
    tags: ['nlp'],
    notes: 'Note beta',
    dateAdded: Date.now(),
    completed: true,
    folderId: 'general'
  }
];

const mockUser = {
  name: 'Test User',
  email: 'test@test.com',
  role: 'student',
  plan: 'free' as any
};

describe('ResourceBoard Component', () => {
  it('should render resources correctly', () => {
    render(
      <ResourceBoard 
        resources={mockResources as any} 
        setResources={vi.fn()} 
        userProfile={mockUser as any} 
      />
    );

    expect(screen.getByText('Resource Alpha')).toBeDefined();
    expect(screen.getByText('Resource Beta')).toBeDefined();
  });

  it('should display "No resources found" when list is empty', () => {
    render(
      <ResourceBoard 
        resources={[]} 
        setResources={vi.fn()} 
        userProfile={mockUser as any} 
      />
    );

    expect(screen.getByText('No resources found in this folder.')).toBeDefined();
  });
});
