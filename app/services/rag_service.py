import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Optional
import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI

logger = logging.getLogger(__name__)

class RAGService:
    """Enhanced Dental RAG System for knowledge and case retrieval"""
    
    def __init__(self):
        self.client = chromadb.PersistentClient(path="./chroma_db")
        self.openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # Initialize embedding function
        self.embedding_function = embedding_functions.OpenAIEmbeddingFunction(
            api_key=os.getenv('OPENAI_API_KEY'),
            model_name="text-embedding-ada-002"
        )
        
        # Collections
        self.cases_collection = None
        self.knowledge_collection = None
        
    def initialize(self):
        """Initialize or get existing collections"""
        try:
            # Cases collection
            try:
                self.cases_collection = self.client.get_collection(
                    name="dental_cases",
                    embedding_function=self.embedding_function
                )
                logger.info(f"✅ Loaded cases collection with {self.cases_collection.count()} items")
            except:
                self.cases_collection = self.client.create_collection(
                    name="dental_cases",
                    embedding_function=self.embedding_function
                )
                logger.info("📦 Created new cases collection")
            
            # Knowledge collection
            try:
                self.knowledge_collection = self.client.get_collection(
                    name="dental_knowledge",
                    embedding_function=self.embedding_function
                )
                logger.info(f"✅ Loaded knowledge collection with {self.knowledge_collection.count()} items")
            except:
                self.knowledge_collection = self.client.create_collection(
                    name="dental_knowledge",
                    embedding_function=self.embedding_function
                )
                logger.info("📦 Created new knowledge collection")
                
        except Exception as e:
            logger.error(f"Error initializing collections: {str(e)}")
            raise
    
    def index_cases(self, cases_dir: str = "DATA/TRAITEMENTS_JSON"):
        """Index clinical cases from JSON files"""
        indexed_count = 0
        
        try:
            for json_file in Path(cases_dir).glob("*.json"):
                with open(json_file, 'r', encoding='utf-8') as f:
                    case_data = json.load(f)
                
                # Create searchable content
                content = f"""
                Patient: {case_data.get('patient_info', {}).get('age', 'Unknown')} ans, {case_data.get('patient_info', {}).get('gender', 'Unknown')}
                Motif: {case_data.get('chief_complaint', '')}
                Diagnostic: {case_data.get('diagnosis', '')}
                Plan de traitement: {json.dumps(case_data.get('treatment_plan', []), ensure_ascii=False)}
                """
                
                self.cases_collection.add(
                    documents=[content],
                    metadatas=[{
                        "title": f"Cas: {case_data.get('chief_complaint', 'Unknown')[:50]}",
                        "patient_age": str(case_data.get('patient_info', {}).get('age', '')),
                        "file": json_file.name
                    }],
                    ids=[f"case_{json_file.stem}"]
                )
                indexed_count += 1
                
        except Exception as e:
            logger.error(f"Error indexing cases: {str(e)}")
        
        logger.info(f"✅ Indexed {indexed_count} clinical cases")
        return indexed_count
    
    def index_knowledge(self, knowledge_dir: str = "DATA/"):
        """Index knowledge articles from various sources"""
        indexed_count = 0
        
        # Index different knowledge sources
        knowledge_sources = [
            ("DATA/DENTAL_KNOWLEDGE", "*.json"),
            ("DATA/specialized_knowledge", "**/*.txt")
        ]
        
        for source_dir, pattern in knowledge_sources:
            try:
                for file_path in Path(source_dir).glob(pattern):
                    if file_path.suffix == '.json':
                        with open(file_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            if isinstance(data, list):
                                for item in data:
                                    self._index_knowledge_item(item, file_path.name)
                                    indexed_count += 1
                            else:
                                self._index_knowledge_item(data, file_path.name)
                                indexed_count += 1
                    else:  # .txt files
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            self.knowledge_collection.add(
                                documents=[content],
                                metadatas=[{
                                    "title": file_path.stem.replace('_', ' ').title(),
                                    "category": file_path.parent.name,
                                    "file": file_path.name
                                }],
                                ids=[f"knowledge_{file_path.stem}_{indexed_count}"]
                            )
                            indexed_count += 1
                            
            except Exception as e:
                logger.error(f"Error indexing knowledge from {source_dir}: {str(e)}")
        
        logger.info(f"✅ Indexed {indexed_count} knowledge articles")
        return indexed_count
    
    def _index_knowledge_item(self, item: Dict, filename: str):
        """Index a single knowledge item"""
        if isinstance(item, dict):
            content = item.get('content', '') or json.dumps(item, ensure_ascii=False)
            title = item.get('title', '') or item.get('name', '') or 'Unknown'
            category = item.get('category', '') or item.get('type', '') or 'General'
        else:
            content = str(item)
            title = 'Knowledge Item'
            category = 'General'
        
        self.knowledge_collection.add(
            documents=[content],
            metadatas=[{
                "title": title,
                "category": category,
                "file": filename
            }],
            ids=[f"knowledge_{filename}_{hash(content) % 10000}"]
        )
    
    def search_cases(self, query: str, n_results: int = 3) -> List[Dict]:
        """Search clinical cases"""
        try:
            results = self.cases_collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            formatted_results = []
            for i in range(len(results['ids'][0])):
                formatted_results.append({
                    'id': results['ids'][0][i],
                    'content': results['documents'][0][i],
                    'title': results['metadatas'][0][i].get('title', 'Unknown Case'),
                    'metadata': results['metadatas'][0][i],
                    'distance': results['distances'][0][i] if 'distances' in results else 0
                })
            
            return formatted_results
        except Exception as e:
            logger.error(f"Error searching cases: {str(e)}")
            return []
    
    def search_knowledge(self, query: str, n_results: int = 5) -> List[Dict]:
        """Search knowledge base"""
        try:
            results = self.knowledge_collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            formatted_results = []
            for i in range(len(results['ids'][0])):
                formatted_results.append({
                    'id': results['ids'][0][i],
                    'content': results['documents'][0][i],
                    'title': results['metadatas'][0][i].get('title', 'Unknown'),
                    'category': results['metadatas'][0][i].get('category', 'General'),
                    'metadata': results['metadatas'][0][i],
                    'distance': results['distances'][0][i] if 'distances' in results else 0
                })
            
            return formatted_results
        except Exception as e:
            logger.error(f"Error searching knowledge: {str(e)}")
            return []
    
    def search_combined(self, query: str, case_results: int = 2, knowledge_results: int = 3) -> Dict:
        """Search both cases and knowledge"""
        return {
            'cases': self.search_cases(query, case_results),
            'knowledge': self.search_knowledge(query, knowledge_results),
            'total_results': case_results + knowledge_results
        }
    
    def reindex_all(self):
        """Reindex all content"""
        logger.info("🔄 Starting complete reindexing...")
        
        # Clear existing collections
        try:
            self.client.delete_collection("dental_cases")
            self.client.delete_collection("dental_knowledge")
        except:
            pass
        
        # Reinitialize
        self.initialize()
        
        # Index content
        cases_count = self.index_cases()
        knowledge_count = self.index_knowledge()
        
        logger.info(f"✅ Reindexing complete: {cases_count} cases, {knowledge_count} knowledge items")
        return {
            'cases': cases_count,
            'knowledge': knowledge_count
        }
    
    def get_statistics(self) -> Dict:
        """Get RAG system statistics"""
        return {
            'cases_count': self.cases_collection.count() if self.cases_collection else 0,
            'knowledge_count': self.knowledge_collection.count() if self.knowledge_collection else 0,
            'total_documents': (self.cases_collection.count() if self.cases_collection else 0) + 
                             (self.knowledge_collection.count() if self.knowledge_collection else 0)
        }