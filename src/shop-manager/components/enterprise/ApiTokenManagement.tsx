import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Key, Plus, Calendar, Activity } from 'lucide-react';
import { enterpriseService } from '@/services/enterpriseService';
import type { ApiToken } from '@/types/phase4';

export const ApiTokenManagement = () => {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const data = await enterpriseService.getApiTokens();
        setTokens(data);
      } catch (error) {
        console.error('Error fetching API tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, []);

  const handleRevokeToken = async (tokenId: string) => {
    try {
      await enterpriseService.revokeApiToken(tokenId);
      setTokens(tokens.map(token => 
        token.id === tokenId ? { ...token, is_active: false } : token
      ));
    } catch (error) {
      console.error('Error revoking token:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Token Management</h2>
          <p className="text-muted-foreground">Manage API tokens for external integrations</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Token
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Tokens</CardTitle>
          <CardDescription>
            Active API tokens for system integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse border rounded-lg p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No API Tokens</h3>
              <p>Create your first API token to enable external integrations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tokens.map((token) => (
                <div key={token.id} className={`border rounded-lg p-4 ${!token.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Key className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{token.name}</h4>
                          <Badge variant={token.is_active ? "default" : "secondary"}>
                            {token.is_active ? "Active" : "Revoked"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Created: {new Date(token.created_at).toLocaleDateString()}
                            </span>
                            {token.last_used_at && (
                              <span className="flex items-center">
                                <Activity className="h-3 w-3 mr-1" />
                                Last used: {new Date(token.last_used_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {token.expires_at && (
                            <div className="text-orange-600">
                              Expires: {new Date(token.expires_at).toLocaleDateString()}
                            </div>
                          )}
                          <div>
                            Permissions: {token.permissions.length > 0 ? token.permissions.join(', ') : 'None'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {token.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevokeToken(token.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};