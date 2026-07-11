
import React from 'react';
import { Grid, Header } from 'semantic-ui-react';
import { Button } from "@/components/ui/button";
import { Settings } from 'lucide-react';

const HeroSection = () => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 rounded-lg mb-6">
      <Grid stackable>
        <Grid.Column width={10}>
          <Header as="h1" className="text-4xl font-bold mb-2">
            Professional Auto Repair Tools
          </Header>
          <p className="text-xl opacity-90 mb-6">
            Find the right tools for every automotive repair and maintenance job. 
            Shop our collection of professional-grade tools trusted by mechanics worldwide.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Button className="bg-white text-blue-700 hover:bg-gray-100 hover:text-blue-800">
              Shop All Categories
            </Button>
            <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
              View Deals
            </Button>
          </div>
        </Grid.Column>
        <Grid.Column width={6} className="flex items-center justify-center">
          <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm border border-white/20 shadow-xl">
            <Settings size={120} className="text-white" />
          </div>
        </Grid.Column>
      </Grid>
    </div>
  );
};

export default HeroSection;
