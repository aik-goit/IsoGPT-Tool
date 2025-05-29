import argparse
import pandas as pd
import requests
from xml.etree import ElementTree
import spacy
from wordcloud import WordCloud
import matplotlib.pyplot as plt

# Load the SciSpacy model
nlp_sm = spacy.load("en_core_sci_sm")

def get_pubmed_articles(query, max_results=1000):
    base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    params = {
        "db": "pubmed",
        "retmode": "xml",
        "term": query,
        "retmax": max_results
    }
    search_response = requests.get(base_url, params=params)
    search_xml = ElementTree.fromstring(search_response.content)
    pmids = [pmid.text for pmid in search_xml.findall(".//IdList/Id")]
    total_found = int(search_xml.find(".//Count").text)
    articles = []
    errors = []
    text = ""
    for pmid in pmids:
        fetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
        fetch_params = {
            "db": "pubmed",
            "retmode": "xml",
            "id": pmid
        }
        fetch_response = requests.get(fetch_url, params=fetch_params)
        print(fetch_response.status_code)
        if fetch_response.status_code == 200:
            article_xml = ElementTree.fromstring(fetch_response.content)
            title = article_xml.find(".//ArticleTitle").text
            abstract_element = article_xml.find(".//AbstractText")
            abstract = abstract_element.text if abstract_element is not None else "Abstract not available"
            
            #text = text+abstract+" "
            # Extract publication year
            pub_date_element = article_xml.find(".//PubDate")
            pub_year = pub_date_element.find("Year").text if pub_date_element is not None and pub_date_element.find("Year") is not None else "Year not available"
            articles.append({'pubmedid': pmid, 'title': title, 'abstract': abstract, 'pub_year': pub_year})
        else:
            errors.append(pmid)
            print(f"Error fetching article with PMID {pmid}")
    
    print(text)
    return articles, total_found, errors

def main():
    # Argument parser
    parser = argparse.ArgumentParser(description="PubMed Article Retrieval and NER Word Cloud Generation")
    parser.add_argument("query", type=str, help="Search term for PubMed articles")

    # Parse command line arguments
    args = parser.parse_args()

    # Example usage:
    articles, total_found, errors = get_pubmed_articles(args.query)

    # Convert articles data into a pandas DataFrame
    df = pd.DataFrame(articles)

    # Save DataFrame to Excel file
    excel_filename = f"pubmed_articles_{args.query}.xlsx"
    df.to_excel(excel_filename, index=False)
    print(f"Excel file '{excel_filename}' saved successfully.")

    # Save DataFrame to CSV file
    csv_filename = f"pubmed_articles_{args.query}.csv"
    df.to_csv(csv_filename, index=False)
    print(f"CSV file '{csv_filename}' saved successfully.")

    # Save errors to a separate Excel sheet
    errors_df = pd.DataFrame({"PubMed IDs with Errors": errors})
    errors_excel_filename = f"pubmed_errors_{args.query}.xlsx"
    errors_df.to_excel(errors_excel_filename, index=False)
    print(f"Excel file '{errors_excel_filename}' saved successfully.")

    # Save errors to a CSV file
    errors_csv_filename = f"pubmed_errors_{args.query}.csv"
    errors_df.to_csv(errors_csv_filename, index=False)
    print(f"CSV file '{errors_csv_filename}' saved successfully.")

    # Perform NER on all abstracts
    all_entities = []
    for abstract in df['abstract']:
        if abstract is not None:  # Check if abstract is not None
            doc = nlp_sm(abstract)
            entities = [ent.text for ent in doc.ents]
            all_entities.extend(entities)

    # Save the extracted entities to a DataFrame
    df_entities = pd.DataFrame({"Entities": all_entities})

    # Save the DataFrame to a CSV file
    entities_csv_filename = f"abstract_entities_{args.query}.csv"
    df_entities.to_csv(entities_csv_filename, index=False)
    print(f"CSV file '{entities_csv_filename}' saved successfully.")

    # Generate a word cloud for the unique terms
    wordcloud = WordCloud(width=800, height=800, background_color='white', min_font_size=10).generate(' '.join(all_entities))

    # Display the word cloud
    plt.figure(figsize=(8, 8), facecolor=None)
    plt.imshow(wordcloud)
    plt.axis("off")
    plt.tight_layout(pad=0)

    # Save the word cloud to an image file
    wordcloud_image_filename = f"wordcloud_{args.query}.png"
    wordcloud.to_file(wordcloud_image_filename)
    print(f"Word cloud image '{wordcloud_image_filename}' saved successfully.")

    # Show the word cloud
    plt.show()


if __name__ == "__main__":
    main()

def run_pubmed_query(query):
    articles, total_found, errors = get_pubmed_articles(query)
    df = pd.DataFrame(articles)

    excel_filename = f"pubmed_articles_{query}.xlsx"
    #df.to_excel(excel_filename, index=False)

    csv_filename = f"pubmed_articles_{query}.csv"
    #df.to_csv(csv_filename, index=False)

    errors_df = pd.DataFrame({"PubMed IDs with Errors": errors})
    #errors_df.to_excel(f"pubmed_errors_{query}.xlsx", index=False)
    #errors_df.to_csv(f"pubmed_errors_{query}.csv", index=False)

    all_entities = []
    text = ""
    lists = []
    index = 0
    for abstract in df['abstract']:
        if abstract is not None:
            text = text+" "+(df['abstract'][index])
            lists.append(text)
            doc = nlp_sm(abstract)
            all_entities.extend([ent.text for ent in doc.ents])
            index = index+1
    

    df_entities = pd.DataFrame({"Entities": all_entities})
    #df_entities.to_csv(f"abstract_entities_{query}.csv", index=False)

    wordcloud = WordCloud(width=800, height=800, background_color='white', min_font_size=10).generate(' '.join(all_entities))
    wordcloud.to_file(f"wordcloud_{query}.png")

    return {
        "total_found": total_found,
        "article_count": len(articles),
        "errors": errors,
        "texts": lists 
    }
