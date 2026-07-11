
import React, { useState } from 'react';
import { Container, Header, Segment, Grid, Icon } from 'semantic-ui-react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbPage, 
  BreadcrumbSeparator, 
  Breadcrumb 
} from '@/components/ui/breadcrumb';
import { Star, ShoppingCart, Heart, Settings, Check, X, Share2, Loader2 } from 'lucide-react';
import { useTool } from '@/hooks/useTool';

export default function ToolDetailPage() {
  const params = useParams<{ category?: string; toolId?: string }>();
  const { category, toolId } = params;
  const [isFavorite, setIsFavorite] = useState(false);
  const { tool, reviews, isLoading, error } = useTool(toolId || '');

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading tool details...</span>
        </div>
      </Container>
    );
  }

  if (error || !tool) {
    return (
      <Container>
        <Segment placeholder>
          <Header icon>
            <Icon name="search" />
            Tool not found
          </Header>
          <Link to="/tools">Back to Tool Categories</Link>
        </Segment>
      </Container>
    );
  }

  return (
    <Container>
      <Segment>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/tools">Tool Categories</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            
            {category && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/tools/${category}`}>{category}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            
            {tool.name && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{tool.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </Segment>

      <Grid stackable columns={2}>
        <Grid.Column width={8}>
          <Segment>
            <img 
              src={tool.image_url || 'https://via.placeholder.com/600x400?text=Tool+Image'} 
              alt={tool.name} 
              style={{ width: '100%' }} 
            />
          </Segment>
        </Grid.Column>
        <Grid.Column width={8}>
          <Segment>
            <Header as="h2">{tool.name}</Header>
            <p>{tool.description}</p>
            <Badge variant="outline">{tool.category}</Badge>
            <div className="flex items-center mt-2">
              <Star className="text-yellow-500 mr-1" size={16} fill="yellow" />
              <span>{tool.rating} ({tool.review_count} reviews)</span>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold">${tool.price}</span>
              {tool.discount && tool.discount > 0 && (
                <Badge className="ml-2 bg-red-100 text-red-800">
                  {tool.discount}% OFF
                </Badge>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <ShoppingCart className="mr-2" size={16} /> Add to Cart
              </Button>
              <Button variant="outline" onClick={() => setIsFavorite(!isFavorite)}>
                {isFavorite ? (
                  <>
                    <Heart className="mr-2 text-red-500" size={16} fill="red" />
                    <span>Remove from Favorites</span>
                  </>
                ) : (
                  <>
                    <Heart className="mr-2" size={16} />
                    <span>Add to Favorites</span>
                  </>
                )}
              </Button>
              <Button variant="ghost">
                <Share2 className="mr-2" size={16} /> Share
              </Button>
            </div>
          </Segment>
        </Grid.Column>
      </Grid>

      <Segment>
        <Tabs defaultValue="specifications">
          <TabsList>
            <TabsTrigger value="specifications">
              Specifications
            </TabsTrigger>
            <TabsTrigger value="reviews">
              Reviews ({reviews.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="specifications">
            <Grid columns={2} divided>
              {tool.specifications && Object.entries(tool.specifications).map(([key, value], index) => (
                <Grid.Row key={index}>
                  <Grid.Column>
                    <strong>{key}</strong>
                  </Grid.Column>
                  <Grid.Column>{String(value)}</Grid.Column>
                </Grid.Row>
              ))}
              {(!tool.specifications || Object.keys(tool.specifications).length === 0) && (
                <Grid.Row>
                  <Grid.Column>
                    <p className="text-gray-500">No specifications available for this tool.</p>
                  </Grid.Column>
                </Grid.Row>
              )}
            </Grid>
          </TabsContent>
          <TabsContent value="reviews">
            {reviews.length > 0 ? reviews.map((review) => (
              <Card key={review.id} className="mb-4">
                <CardContent>
                  <div className="flex items-center mb-2">
                    <Star className="text-yellow-500 mr-1" size={14} fill="yellow" />
                    <span>{review.rating}</span>
                    <span className="ml-2 text-gray-500">by {review.user_name}</span>
                  </div>
                  <p>{review.comment}</p>
                  <div className="text-gray-500 text-sm mt-2">
                    Posted on {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            )) : (
              <p className="text-gray-500">No reviews available for this tool.</p>
            )}
          </TabsContent>
        </Tabs>
      </Segment>
    </Container>
  );
}
